#!/usr/bin/env python3
"""YouTube動画別KPI（再生数・サムネCTR・視聴者維持率・LINE追加数）を Notion の
「YouTube KPI」DBに流し込む。動画タイトル＋公開日で突き合わせて更新／新規作成する。

  python3 scripts/upsert-youtube-kpi.py [--dry]

入力:
  youtube-ctr/all_videos.json                     動画・再生数
  youtube-ctr/ctr_summary.json                    サムネCTR（Reporting API）
  youtube-ctr/retention/<期間>.json               視聴者維持率（Analytics API）
  scratchpad の line_tracking.json                UTAGE 登録経路別のLINE追加数
"""
import json, os, re, sys, unicodedata, urllib.request
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
YC = ROOT / "youtube-ctr"
SC = Path("/private/tmp/claude-501/-Users-takeshi-workspace-works/cea57ebc-562f-4b24-aee4-9344ab807c30/scratchpad/yt")
DS = "4456ac78-5543-43a9-8078-a74f61705bed"
MEASURED = "2026-08-31"
DRY = "--dry" in sys.argv

TOKEN = next((l.split("=", 1)[1].strip() for l in (ROOT / "pl-dashboard/.env.local").read_text().splitlines()
              if l.startswith("NOTION_TOKEN=")), None)
H = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2025-09-03", "Content-Type": "application/json"}

# all_videos のチャンネル名 → Notion「チャンネル」セレクトの選択肢
CHANNEL = {
    "白谷塾チャンネル": "白谷塾チャンネル",
    "たけちゃん先生の逆転合格チャンネル": "たけちゃん先生",
    "英検逆転コース【白谷塾オンライン教室】": "英検コース",
    "共通テスト｢物理｣最短攻略【たけちゃん先生の最短物理】": "共通テスト「物理」",
    "共通テスト「国語」最短攻略チャンネル【たけちゃん先生】": "共通テスト「国語」",
    "共通テスト「情報」最短攻略チャンネル【たけちゃん先生】": "共通テスト「情報」",
    "医学部 再受験といえばローカルメディ": "医学科再受験",
    "地方医学部オンライン塾 ローカルメディ【白谷塾発】": "ローカルメディ",
}


def api(method, path, body=None):
    req = urllib.request.Request(f"https://api.notion.com/v1/{path}", method=method, headers=H,
                                 data=json.dumps(body).encode() if body else None)
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def norm(s):
    s = unicodedata.normalize("NFKC", s)
    for _ in range(2):
        s = re.sub(r"^\s*(たけ|白|たけちゃん)\s*", "", s)
        s = re.sub(r"^\s*\d{1,2}/\d{1,2}\s*[（(]?[月火水木金土日]?[）)]?\s*", "", s)
    s = re.sub(r"[\s　]", "", s)
    return re.sub(r"[!！?？。、,.・…“”\"'’‘\-—ー~〜:：/]", "", s).lower()


def sec(d):
    m = re.match(r"(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?", d or "")
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + s


def build_rows():
    av = json.loads((YC / "all_videos.json").read_text())
    ctr = json.loads((YC / "ctr_summary.json").read_text())
    ret = json.loads((YC / "retention/2026-07-01_2026-08-31.json").read_text())
    tr = json.loads((SC / "line_tracking.json").read_text())

    retmap = {vid: d for ch in ret.values() for vid, d in ch["videos"].items()}
    adds = {}
    for src in tr["sources"]:
        for name, n in src["rows"]:
            if name.startswith("*"):
                continue
            k = norm(name)
            if n >= adds.get(k, (0, ""))[0]:
                adds[k] = (n, name)

    def match(title):
        t = norm(title)
        best = (0, "")
        for k, (n, orig) in adds.items():
            if not k:
                continue
            a, b = (t, k) if len(t) <= len(k) else (k, t)
            if ((len(a) >= 12 and a in b) or SequenceMatcher(None, t, k).ratio() >= 0.72) and n >= best[0]:
                best = (n, orig)
        return best

    rows, seen = [], set()
    for ch in av.values():
        for v in ch["videos"]:
            if v["date"] < "2026-07-01" or v["privacy"] != "public" or sec(v["dur"]) < 80:
                continue
            key = (v["date"], v["title"])
            if key in seen:
                continue
            seen.add(key)
            c = ctr.get(v["id"])
            r = retmap.get(v["id"])
            n, route = match(v["title"])
            rows.append({
                "title": v["title"], "date": v["date"], "channel": CHANNEL.get(ch["channel"]),
                "url": f"https://www.youtube.com/watch?v={v['id']}", "views": v["views"],
                "ctr": c["ctr"] if c else None,
                "retention": (r["avg_pct"] / 100) if r and r.get("avg_pct") is not None else None,
                "adds": n, "route": route,
            })
    rows.sort(key=lambda r: r["date"])
    return rows


def existing():
    out, cur = {}, None
    while True:
        body = {"page_size": 100}
        if cur:
            body["start_cursor"] = cur
        res = api("POST", f"data_sources/{DS}/query", body)
        for pg in res["results"]:
            p = pg["properties"]
            t = "".join(x["plain_text"] for x in p["動画タイトル"]["title"])
            d = (p["公開日"].get("date") or {}).get("start")
            out[(d, t)] = pg["id"]
        if not res.get("has_more"):
            return out
        cur = res["next_cursor"]


def props(r):
    def num(v):
        return {"number": v if v is not None else None}
    return {
        "動画タイトル": {"title": [{"type": "text", "text": {"content": r["title"][:2000]}}]},
        "リンク": {"url": r["url"]},
        "チャンネル": {"select": {"name": r["channel"]} if r["channel"] else None},
        "公開日": {"date": {"start": r["date"]}},
        "再生数": num(r["views"]),
        "サムネクリック率": num(round(r["ctr"], 6) if r["ctr"] is not None else None),
        "視聴者維持率": num(round(r["retention"], 6) if r["retention"] is not None else None),
        "LINE追加数": num(r["adds"]),
        "計測日": {"date": {"start": MEASURED}},
        "経路キー": {"rich_text": ([{"type": "text", "text": {"content": r["route"][:2000]}}] if r["route"] else [])},
    }


def main():
    rows = build_rows()
    have = existing()
    created = updated = 0
    for r in rows:
        pid = have.get((r["date"], r["title"]))
        if DRY:
            print(("更新 " if pid else "新規 ") + f"{r['date']} {r['title'][:36]}")
            continue
        if pid:
            api("PATCH", f"pages/{pid}", {"properties": props(r)})
            updated += 1
        else:
            api("POST", "pages", {"parent": {"type": "data_source_id", "data_source_id": DS},
                                  "properties": props(r)})
            created += 1
    print(f"対象 {len(rows)}本 → 新規 {created} / 更新 {updated}"
          f"{'（--dry のため書き込みなし）' if DRY else ''}")


if __name__ == "__main__":
    main()
