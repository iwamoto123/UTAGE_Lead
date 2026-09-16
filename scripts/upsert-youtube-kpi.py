#!/usr/bin/env python3
"""YouTube動画別KPI（再生数・サムネCTR・視聴者維持率）を Notion の
「YouTube KPI」DBに流し込む。動画タイトル＋公開日で突き合わせて更新／新規作成する。

  python3 scripts/upsert-youtube-kpi.py [--dry]

入力:
  youtube-ctr/all_videos.json                     動画・再生数
  youtube-ctr/ctr_summary.json                    サムネCTR（Reporting API）
  youtube-ctr/retention/<期間>.json               視聴者維持率（Analytics API）

LINE追加数と経路キーはここでは触らない。動画タイトルとUTAGEのラベル名のあいまい一致で
入れていたころ、数IAの行に数IIBCのラベルが入って同じ登録者を2本ぶん数えていた。
いまは scripts/sync-youtube-line-adds.py が経路キーの完全一致で数え直す。
"""
import json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
YC = ROOT / "youtube-ctr"
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


def sec(d):
    m = re.match(r"(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?", d or "")
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + s


def build_rows():
    av = json.loads((YC / "all_videos.json").read_text())
    ctr = json.loads((YC / "ctr_summary.json").read_text())
    ret = json.loads((YC / "retention/2026-07-01_2026-08-31.json").read_text())
    retmap = {vid: d for ch in ret.values() for vid, d in ch["videos"].items()}

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
            rows.append({
                "title": v["title"], "date": v["date"], "channel": CHANNEL.get(ch["channel"]),
                "url": f"https://www.youtube.com/watch?v={v['id']}", "views": v["views"],
                "ctr": c["ctr"] if c else None,
                "retention": (r["avg_pct"] / 100) if r and r.get("avg_pct") is not None else None,
                "dur": sec(v["dur"]),
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
    p = {
        "動画タイトル": {"title": [{"type": "text", "text": {"content": r["title"][:2000]}}]},
        "リンク": {"url": r["url"]},
        "チャンネル": {"select": {"name": r["channel"]} if r["channel"] else None},
        "公開日": {"date": {"start": r["date"]}},
        "再生数": num(r["views"]),
        "サムネクリック率": num(round(r["ctr"], 6) if r["ctr"] is not None else None),
        "視聴者維持率": num(round(r["retention"], 6) if r["retention"] is not None else None),
        "尺（秒）": num(r.get("dur")),
        "計測日": {"date": {"start": MEASURED}},
    }
    return p


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
