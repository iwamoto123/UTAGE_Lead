#!/usr/bin/env python3
"""動画ごとの「LINE追加数」を UTAGE の登録経路ラベルから数え直して Notion「YouTube KPI」DBへ入れる。

  python3 scripts/sync-youtube-line-adds.py           # 差分を出すだけ
  python3 scripts/sync-youtube-line-adds.py --write   # Notionに書き込む
  python3 scripts/sync-youtube-line-adds.py --since 2026-04-01

Notionの「経路キー」に入っている文字列を UTAGE の登録経路ラベル名とそのまま突き合わせ、
そのラベルから登録した読者の実数を数える。タイトルのあいまい一致はしない
（以前それで 数IA の行に 数IIBC のラベルが入り、同じ登録者を2本で二重に数えていた）。

登録が1件も無いラベルは読者から数えられないので、UTAGEの登録経路の一覧を
scripts/utage-trackings-cache.json に持っておき、そこに在るラベルは 0件 として入れる。
一覧の取り直しは --refresh-labels（全アカウントを舐めるので10分ほどかかる）。

経路キーが空の行・UTAGEに無いラベルの行は書き換えず、最後に一覧で出す。
そこは人がUTAGE管理画面のラベル名をコピーして経路キーに貼る。
ラベル名は「登録経路」画面の名前そのまま（先頭の「白」「たけ」「9/12」などを含む）。
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DS = "4456ac78-5543-43a9-8078-a74f61705bed"          # Notion YouTube KPI
UTAGE_BASE = "https://api.utage-system.com/v1"
# UTAGEアカウントの一覧は kpi-notifier のマップを正本にする（新規アカウントはあちらに1行足す）
sys.path.insert(0, str(ROOT / "slack-automation/kpi-notifier/src"))
from accounts import ACCOUNTS  # noqa: E402


def env(path: Path, key: str) -> str | None:
    if not path.exists():
        return None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


NOTION_TOKEN = env(ROOT / "pl-dashboard/.env.local", "NOTION_TOKEN")
UTAGE_KEY = env(ROOT / "slack-automation/utage-sync/.env", "UTAGE_API_KEY")
NH = {"Authorization": f"Bearer {NOTION_TOKEN}", "Notion-Version": "2025-09-03",
      "Content-Type": "application/json"}


def notion(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(f"https://api.notion.com/v1/{path}", method=method, headers=NH,
                                 data=json.dumps(body).encode() if body else None)
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def utage(path: str, params: dict) -> dict | None:
    url = UTAGE_BASE + path + "?" + urllib.parse.urlencode(params)
    for attempt in range(7):
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {UTAGE_KEY}"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(5 * (attempt + 1))
                continue
            if e.code == 404:
                return None
            raise
    return None


def key(s: str) -> str:
    """表記ゆれだけを吸収する。濁点の合成・全半角・前後の空白まで。語句は変えない。"""
    return unicodedata.normalize("NFKC", s or "").strip()


def fetch_label_counts(since: str) -> dict[str, dict]:
    """ラベル名 → {n: 実登録者数, accounts: [アカウント名]}。同名が複数アカウントにあれば合算する。"""
    seen: dict[str, set] = defaultdict(set)
    accs: dict[str, set] = defaultdict(set)
    for acc, (name, _biz, _kind) in ACCOUNTS.items():
        page, stop = 1, False
        while not stop:
            data = utage(f"/accounts/{acc}/readers", {"page": page, "per_page": 100})
            if not data:
                break
            rows = data.get("data", [])
            for rd in rows:
                created = (rd.get("created_at") or "")[:10]
                if not created:
                    continue
                if created < since:       # UTAGEは新しい順。これ以降は全部古い
                    stop = True
                    break
                label = rd.get("message_tracking_name")
                if not label:
                    continue
                k = key(label)
                seen[k].add(rd.get("common_reader_id") or rd.get("id"))
                accs[k].add(name)
            meta = data.get("meta", {})
            total, per = meta.get("total", 0), meta.get("per_page", 100) or 100
            if stop or not rows or meta.get("current_page", page) * per >= total:
                break
            page += 1
            time.sleep(0.25)
    return {k: {"n": len(v), "accounts": sorted(accs[k])} for k, v in seen.items()}


CACHE = Path(__file__).with_name("utage-trackings-cache.json")


def load_label_names() -> dict[str, list[str]]:
    """キャッシュしてある登録経路ラベル名 → アカウント名。登録0件のラベルを 0 と書くために使う。"""
    if not CACHE.exists():
        return {}
    data = json.loads(CACHE.read_text(encoding="utf-8"))
    out: dict[str, list[str]] = defaultdict(list)
    for t in data["trackings"]:
        k = key(t["name"])
        if t["account"] not in out[k]:
            out[k].append(t["account"])
    return out


def refresh_label_names() -> None:
    """全アカウント×全シナリオの登録経路を取り直してキャッシュに保存する。数分かかる。"""
    out = []
    for acc, (name, _b, _k) in ACCOUNTS.items():
        scenarios = utage(f"/accounts/{acc}/scenarios", {}) or {}
        for s in scenarios.get("data", []):
            tr = utage(f"/accounts/{acc}/scenarios/{s['id']}/trackings", {}) or {}
            for t in tr.get("data", []):
                out.append({"account": name, "name": t["name"]})
            time.sleep(0.15)
        print(f"  {name}: {len(out)}ラベル", flush=True)
    out = [{"account": a, "name": n} for a, n in sorted({(t["account"], t["name"]) for t in out})]
    CACHE.write_text(json.dumps({"fetched_at": time.strftime("%Y-%m-%d"), "trackings": out},
                                ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {CACHE.name} に {len(out)}件")


def fetch_rows() -> list[dict]:
    out, cur = [], None
    while True:
        body = {"page_size": 100}
        if cur:
            body["start_cursor"] = cur
        res = notion("POST", f"data_sources/{DS}/query", body)
        for pg in res["results"]:
            p = pg["properties"]
            out.append({
                "id": pg["id"],
                "title": "".join(x["plain_text"] for x in p["動画タイトル"]["title"]),
                "published": (p["公開日"].get("date") or {}).get("start"),
                "channel": (p["チャンネル"].get("select") or {}).get("name"),
                "adds": p["LINE追加数"].get("number"),
                "route": "".join(x["plain_text"] for x in p["経路キー"]["rich_text"]),
            })
        if not res.get("has_more"):
            break
        cur = res["next_cursor"]
    out.sort(key=lambda r: r["published"] or "")
    return out


def suggest(title: str, labels: dict[str, dict], known: dict[str, list[str]]) -> list[str]:
    """経路キーが埋まっていない行に、貼るべきラベル名の当たりを付ける（書き込みはしない）。"""
    t = key(title)
    names = set(labels) | set(known)
    hits = [(round(SequenceMatcher(None, t, k).ratio(), 2), k) for k in names if len(k) >= 10]
    hits = sorted((h for h in hits if h[0] >= 0.55), reverse=True)[:3]
    return [f'{r} {labels[k]["n"] if k in labels else 0}件  {k}' for r, k in hits]


def main() -> int:
    ap = argparse.ArgumentParser(description="UTAGEの登録経路ラベルからLINE追加数を数え直す")
    ap.add_argument("--write", action="store_true", help="Notionに書き込む")
    ap.add_argument("--since", help="この日付以降の登録を数える。既定はDBの最古の公開日")
    ap.add_argument("--measured", help="計測日。既定は今日")
    ap.add_argument("--refresh-labels", action="store_true",
                    help="登録経路ラベルの一覧を取り直す（10分ほどかかる）")
    args = ap.parse_args()
    if not NOTION_TOKEN or not UTAGE_KEY:
        print("NOTION_TOKEN / UTAGE_API_KEY が読めません。", file=sys.stderr)
        return 2
    if args.refresh_labels:
        refresh_label_names()

    rows = fetch_rows()
    since = args.since or min((r["published"] for r in rows if r["published"]), default="2026-01-01")
    measured = args.measured or time.strftime("%Y-%m-%d")
    print(f"{len(rows)}本 / {since} 以降の登録を数えます")
    labels = fetch_label_counts(since)
    known = load_label_names()
    print(f"UTAGEの登録経路ラベル {len(labels)}種に登録あり"
          f"{f' / ラベル一覧 {len(known)}種' if known else '（ラベル一覧のキャッシュなし）'}\n")

    changed, missing = [], []
    for r in rows:
        k = key(r["route"])
        if k in labels:
            n, accs = labels[k]["n"], labels[k]["accounts"]
        elif k and k in known:
            n, accs = 0, known[k]          # ラベルは在るが登録者が1人もいない
        else:
            missing.append(r)
            continue
        if n != r["adds"]:
            changed.append((r, n, accs))

    for r, n, accs in changed:
        print(f'{r["published"]} {r["title"][:30]:32} {r["adds"]} → {n}  [{"/".join(accs)}]')
        if args.write:
            notion("PATCH", f'pages/{r["id"]}', {"properties": {
                "LINE追加数": {"number": n},
                "計測日": {"date": {"start": measured}},
            }})

    if missing:
        print("\n── 経路キーが未設定／UTAGEに無いラベル（触っていません） ──")
        for r in missing:
            print(f'{r["published"]} [{r["channel"]}] {r["title"][:34]}  経路キー={r["route"]!r}')
            for line in suggest(r["title"], labels, known):
                print(f"      候補 {line}")

    print(f'\n{"書き込み" if args.write else "差分"} {len(changed)}件 / 未突合 {len(missing)}件'
          f'{"" if args.write else "（--write で反映）"}')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
