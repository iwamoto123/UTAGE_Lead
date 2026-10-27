#!/usr/bin/env python3
"""通帳から確実に読み取れる宮崎教室の実額を月次PLへ反映する。

反映するのは、この口座からの引き落としがそのまま宮崎教室の費用になる2科目だけ。
売上・人件費・業務委託費などは3事業に按分されていて通帳から割り戻せないため触らない。

  python3 scripts/miyazaki-bank/apply.py [--dry]
"""
import json, sys, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from classify import agg

DRY = "--dry" in sys.argv
ROOT = Path(__file__).resolve().parents[2]
TOKEN = next(l.split("=", 1)[1].strip() for l in (ROOT / ".env.local").read_text().splitlines()
             if l.startswith("NOTION_TOKEN="))
H = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2025-09-03", "Content-Type": "application/json"}
DS = "b8ee1633-7341-4fb8-a926-c308d35f1674"
MIYAZAKI = "33588258-2d8c-8172-a026-f20baacea13a".replace("-", "")

# 通帳がそのまま宮崎教室の金額になる科目。
# 水道光熱費は入れない。通帳にはガスと上下水道しか出てこず、電気代は別の支払い方法に
# なっている。通帳の額で上書きすると電気代を消してしまう。
FIELDS = {"法人間移動": "法人間移動"}
MONTHS = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]   # 3月は27日以降しかないので除外


def api(method, path, body=None):
    req = urllib.request.Request(f"https://api.notion.com/v1/{path}", method=method, headers=H,
                                 data=json.dumps(body).encode() if body else None)
    with urllib.request.urlopen(req) as r:
        return json.load(r)


pages = {}
for pg in api("POST", f"data_sources/{DS}/query", {"page_size": 100})["results"]:
    p = pg["properties"]
    if MIYAZAKI not in [r["id"].replace("-", "") for r in p["事業-年度"]["relation"]]:
        continue
    d = (p["対象月"].get("date") or {}).get("start")
    if d:
        pages[d[:7]] = (pg["id"], p)

changed = 0
for m in MONTHS:
    if m not in pages:
        print(f"{m} 宮崎教室の行がありません → スキップ")
        continue
    pid, props = pages[m]
    patch, log = {}, []
    for cat, prop in FIELDS.items():
        bank = agg.get((m, cat), 0)
        cur = props.get(prop, {}).get("number")
        if cur == bank:
            continue
        patch[prop] = {"number": bank}
        log.append(f"{prop} {('—' if cur is None else format(cur, ','))} → {bank:,}")
    if not patch:
        print(f"{m} 変更なし")
        continue
    changed += 1
    print(f"{m} {' / '.join(log)}" + ("  ※--dryのため未反映" if DRY else ""))
    if not DRY:
        api("PATCH", f"pages/{pid}", {"properties": patch})
print(f"\n{changed}ヶ月を更新" + ("（--dry）" if DRY else ""))
