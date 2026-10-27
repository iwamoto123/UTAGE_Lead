#!/usr/bin/env python3
"""宮﨑教室の通帳（宮崎太陽銀行）を分類して月次に集計する。
入力: txns.tsv（通帳スキャンからの転記。残高の連鎖で検算済み）"""
import csv, re, sys
from collections import defaultdict
from pathlib import Path

ROWS = list(csv.DictReader(open(Path(__file__).parent / "txns.tsv"), delimiter="\t"))

# 個人名かどうか。カタカナ（＋空白・括弧）だけで、法人記号や既知の語を含まないもの
KNOWN = ("振込手数料", "総給振資金", "総振手数料", "上下水道料", "ビジネスWEB",
         "ATM入金", "お利息", "CATVリヨウキン", "DF.アルフアーヤチン", "セゾン",
         "M-NETセンター", "グーグル")

def is_person(m):
    if any(k in m for k in KNOWN): return False
    if m.startswith("カ)") or "(カ" in m: return False
    return bool(re.fullmatch(r"[ァ-ヴー\s（）()0-9カツブン]+", m))

def classify(r):
    m, inn = r["memo"], int(r["in"]) > 0
    if inn:
        if "M-NETセンター" in m:        return "売上", "M-NET（月謝の口座振替）"
        if "グーグル" in m:              return "その他売上", "Google AdSense"
        if "ユニヴアペイキヤスト" in m:  return "売上", "UnivaPay（カード決済の入金）"
        if "シヤラン" in m:              return "▲対象外", "白谷塾オンラインの月謝（宮崎教室ではない）"
        if "カ)シラタニジユク" in m:     return "法人間移動（入金）", "株)白谷塾から入金"
        if "ATM入金" in m:               return "売上", "現金で預かった月謝袋のまとめ入金"
        if "お利息" in m:                return "その他売上", "預金利息"
        if is_person(m):                 return "売上", "個人名の入金＝月謝"
        return "▲要確認", "分類不明の入金"
    # 出金
    if "総給振資金" in m:                        return "総給振（前月分のバイト代）", "総合給与振込"
    if any(k in m for k in ("振込手数料","総振手数料","ビジネスWEB")): return "支払手数料", "振込手数料等"
    if "セゾン" in m:                            return "▲対象外", "広告費（カード明細で別途計上済み）"
    if "ワタナベセキユガス" in m:                return "水道光熱費", "ガス"
    if "上下水道料" in m:                        return "水道光熱費", "上下水道"
    if "DF.アルフアーヤチン" in m:               return "地代家賃", "家賃"
    if "CATVリヨウキン" in m:                    return "通信費", "CATV"
    if "アテナ" in m:                            return "業務委託費", "アテナクリエイション"
    if "カ)シラタニジユク" in m:                 return "法人間移動", "株)白谷塾へ送金"
    if "カ)ブシドウ" in m:                       return "法人間移動", "株)武士道へ送金"
    if "ノダケンセツ" in m:                      return "修繕費", "野田建設"
    if is_person(m):                             return "人件費（バイト代）", "個人名への振込＝バイト代"
    return "▲要確認", "分類不明の出金"

agg = defaultdict(int)                 # (月, 科目) → 金額
detail = defaultdict(list)
for r in ROWS:
    cat, note = classify(r)
    amt = int(r["in"]) if int(r["in"]) > 0 else int(r["out"])
    ym = r["date"][:7]
    agg[(ym, cat)] += amt
    detail[(ym, cat)].append((r["date"], r["memo"], amt, note))

if __name__ == "__main__":
    months = sorted({k[0] for k in agg})
    cats = ["売上", "その他売上", "総給振（前月分のバイト代）", "人件費（バイト代）", "業務委託費",
            "地代家賃", "水道光熱費", "通信費", "支払手数料", "修繕費", "その他経費",
            "法人間移動", "▲対象外", "▲要確認"]
    print("科目".ljust(20) + "".join(m.rjust(12) for m in months))
    print("-" * (20 + 12 * len(months)))
    for c in cats:
        vals = [agg.get((m, c), 0) for m in months]
        if not any(vals): continue
        print(c.ljust(20) + "".join(f"{v:>12,}" for v in vals))
    if "-v" in sys.argv:
        for m in months:
            for c in cats:
                ds = detail.get((m, c))
                if not ds: continue
                print(f"\n■ {m} {c} ¥{agg[(m,c)]:,}（{len(ds)}件）")
                for d in ds: print(f"    {d[0]} {d[1][:26]:28s} ¥{d[2]:>10,}  {d[3]}")
