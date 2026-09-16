#!/usr/bin/env python3
"""短期プログラムの「決済・予約＝成約」を広告クリエイティブ別に振り分けて週次広告レポートへ入れる。

  python3 scripts/sync-program-conversions.py           # 差分を出すだけ
  python3 scripts/sync-program-conversions.py --write   # Notionに書き込む

共テ残り100日・9月模試のように **LPを4本出し分けていても決済者シナリオは1本** という作りだと、
流入経路マスターの「キャンペーン」を1つに決められないので、meta-ads-sync の週次集計では
成約数が空欄のままになる。ここでは決済者シナリオの読者を、同じアカウントの
**どの流入シナリオ（＝どの広告クリエイティブ）から入った人か** で振り分けて数える。
UTAGEの common_reader_id はアカウント内で共通なので、決済者と流入シナリオを突き合わせられる。

複数の流入シナリオに入っている人は、いちばん早い登録を流入元とする。
流入シナリオがメインLINE（広告ではない）の人は、広告の成果には数えない。

プログラムが走っている間は毎日回す。meta-ads-sync は成約数を書かないので取り合いにならない。
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROUTE_DS = "097f9138-25b4-450c-be98-b116973d59df"    # UTAGE 流入経路マスター
WEEKLY_DS = "f7788828-c0d8-4d5b-8cc0-2394ba947cd6"   # 週次広告レポート
CAMPAIGN_DS = "8e8bab1e-37de-4739-a814-b5108901523c"  # キャンペーンマスター
UTAGE_BASE = "https://api.utage-system.com/v1"
WEEK_ANCHOR = 2          # 水曜はじまり（週次広告レポートの区切りに合わせる）
CONVERSION = "成約（面談予約・決済）"


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


def notion_query(ds: str, body: dict | None = None) -> list[dict]:
    out, cur = [], None
    while True:
        b = dict(body or {})
        b["page_size"] = 100
        if cur:
            b["start_cursor"] = cur
        res = notion("POST", f"data_sources/{ds}/query", b)
        out += res["results"]
        if not res.get("has_more"):
            return out
        cur = res["next_cursor"]


def utage(path: str, params: dict | None = None) -> dict | None:
    url = UTAGE_BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
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


def txt(pr: dict, key: str) -> str:
    p = pr.get(key) or {}
    if p.get("type") == "title":
        return "".join(x["plain_text"] for x in p["title"])
    if p.get("type") == "rich_text":
        return "".join(x["plain_text"] for x in p["rich_text"])
    return ""


def week_start(d: date) -> date:
    return d - timedelta(days=(d.weekday() - WEEK_ANCHOR) % 7)


def _d(s: str) -> date:
    y, m, dd = (int(x) for x in s[:10].split("-"))
    return date(y, m, dd)


def scenario_readers(account_id: str, scenario_id: str) -> list[tuple[str, str]]:
    """(登録日, common_reader_id) のリスト。"""
    out, page = [], 1
    while True:
        data = utage(f"/accounts/{account_id}/scenarios/{scenario_id}/readers",
                     {"page": page, "per_page": 100})
        if not data:
            break
        rows = data.get("data", [])
        for rd in rows:
            out.append(((rd.get("created_at") or "")[:10],
                        rd.get("common_reader_id") or rd.get("id") or ""))
        meta = data.get("meta", {})
        total, per = meta.get("total", 0), meta.get("per_page", 100) or 100
        if not rows or meta.get("current_page", page) * per >= total:
            break
        page += 1
        time.sleep(0.2)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="短期プログラムの成約をクリエイティブ別に振り分ける")
    ap.add_argument("--write", action="store_true", help="Notionに書き込む")
    ap.add_argument("--since", default="2026-08-01", help="この日付以降の成約を数える")
    args = ap.parse_args()
    if not NOTION_TOKEN or not UTAGE_KEY:
        print("NOTION_TOKEN / UTAGE_API_KEY が読めません。", file=sys.stderr)
        return 2

    # 流入経路マスターを、成約シナリオ（キャンペーン未紐づけ）と流入シナリオに分ける
    conv_routes: list[dict] = []
    lead_routes: dict[str, list[dict]] = defaultdict(list)   # account_id → [{scenario_id, campaign}]
    for pg in notion_query(ROUTE_DS):
        pr = pg["properties"]
        acc, scen = txt(pr, "UTAGEアカウントID"), txt(pr, "UTAGEシナリオID")
        if not acc or not scen:
            continue
        rel = [r["id"] for r in (pr.get("キャンペーン", {}).get("relation") or [])]
        row = {"account": acc, "scenario": scen, "name": txt(pr, "UTAGEシナリオ名"),
               "account_name": txt(pr, "UTAGEアカウント名"), "campaign": rel[0] if rel else None}
        if (pr.get("用途", {}).get("select") or {}).get("name") == CONVERSION:
            if not row["campaign"]:
                conv_routes.append(row)   # 1本のシナリオを複数クリエイティブで共有している
        elif row["campaign"]:
            lead_routes[acc].append(row)

    if not conv_routes:
        print("キャンペーン未紐づけの成約シナリオはありません。")
        return 0

    names = {pg["id"]: txt(pg["properties"], "キャンペーン名") for pg in notion_query(CAMPAIGN_DS)}

    # (campaign_page_id, week_start) → 成約数
    counts: dict[tuple[str, date], int] = defaultdict(int)
    unattributed: list[str] = []
    for cr in conv_routes:
        leads = lead_routes.get(cr["account"]) or []
        if not leads:
            continue
        # 流入シナリオごとの読者。1人が複数に入っていることがあるので、いちばん早い登録を採る
        source: dict[str, tuple[str, dict]] = {}
        for lr in leads:
            for day, rid in scenario_readers(lr["account"], lr["scenario"]):
                if rid and (rid not in source or day < source[rid][0]):
                    source[rid] = (day, lr)
        print(f"■ {cr['account_name']} / {cr['name']}")
        for day, rid in scenario_readers(cr["account"], cr["scenario"]):
            if not day or day < args.since:
                continue
            hit = source.get(rid)
            if not hit:
                unattributed.append(f"{cr['account_name']} {day} {rid}")
                continue
            counts[(hit[1]["campaign"], week_start(_d(day)))] += 1

    # 週次広告レポートの該当行を更新する
    rows = notion_query(WEEKLY_DS, {"filter": {"property": "期間", "date": {"on_or_after": args.since}}})
    idx: dict[tuple[str, str], dict] = {}
    for pg in rows:
        pr = pg["properties"]
        start = (pr.get("期間", {}).get("date") or {}).get("start")
        for r in (pr.get("キャンペーン", {}).get("relation") or []):
            idx[(r["id"], start)] = {"id": pg["id"], "now": (pr.get("成約数") or {}).get("number")}

    # 振り分け先になったキャンペーンの行は、成約が無かった週も 0 で埋める。
    # 空欄のままだと「まだ数えていない」のか「0件だった」のか読み手に分からない
    targets = {c for c, _ in counts}
    for (camp, start) in idx:
        if camp in targets:
            counts.setdefault((camp, _d(start)), 0)

    changed = missing = 0
    for (camp, ws), n in sorted(counts.items(), key=lambda x: (x[0][1], names.get(x[0][0], ""))):
        hit = idx.get((camp, ws.isoformat()))
        label = names.get(camp, "(不明)")
        if not hit:
            print(f"  {ws} {label}: 成約{n} → 週次の行が無いので書けません")
            missing += 1
            continue
        if hit["now"] == n:
            continue
        print(f"  {ws} {label}: 成約 {hit['now']} → {n}")
        changed += 1
        if args.write:
            notion("PATCH", f"pages/{hit['id']}", {"properties": {"成約数": {"number": n}}})

    if unattributed:
        print(f"\n流入シナリオが分からない成約 {len(unattributed)}件（メインLINE経由など・広告には数えない）")
        for u in unattributed[:10]:
            print(f"  {u}")
    print(f'\n{"書き込み" if args.write else "差分"} {changed}件'
          f'{f" / 週次行なし {missing}件" if missing else ""}'
          f'{"" if args.write else "（--write で反映）"}')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
