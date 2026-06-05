import type { Breakdown } from "@/lib/db";
import { yen, pct } from "@/lib/format";

interface Props {
  revenue: number;       // 売上合計（=100%基準）
  kyozaiGenka: number;   // 教材原価
  costs: Breakdown[];    // 販管費内訳
  profit: number;        // 営業利益
}

interface Segment {
  label: string;
  shortLabel: string;
  value: number;
  color: string;
  category: "原価" | "販管費" | "利益" | "損失";
}

// ラベルを短縮表記
const SHORT_LABEL: Record<string, string> = {
  "教材原価": "原価",
  "人件費（バイト代）": "バイト",
  "社員給与": "給与",
  "業務委託費": "委託",
  "広告費": "広告",
  "地代家賃": "家賃",
  "水道光熱費": "光熱",
  "通信費": "通信",
  "SaaS利用料": "SaaS",
  "外注費": "外注",
  "支払手数料": "手数料",
  "リース料": "リース",
  "減価償却費": "償却",
  "その他経費": "その他",
  "営業利益": "利益",
  "営業損失（赤字）": "赤字",
};

export default function RevenueShareBar({ revenue, kyozaiGenka, costs, profit }: Props) {
  if (revenue === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded p-4">
        <h3 className="font-bold text-sm mb-3">📊 売上100%の使い道</h3>
        <div className="text-xs text-slate-400 py-8 text-center">売上データがありません</div>
      </div>
    );
  }

  const segments: Segment[] = [];

  if (kyozaiGenka > 0) {
    segments.push({ label: "教材原価", shortLabel: SHORT_LABEL["教材原価"], value: kyozaiGenka, color: "#92400e", category: "原価" });
  }
  for (const c of costs) {
    if (c.value > 0) {
      segments.push({ label: c.label, shortLabel: SHORT_LABEL[c.label] ?? c.label, value: c.value, color: c.color, category: "販管費" });
    }
  }
  if (profit >= 0) {
    if (profit > 0) {
      segments.push({ label: "営業利益", shortLabel: "利益", value: profit, color: "#059669", category: "利益" });
    }
  } else {
    segments.push({ label: "営業損失（赤字）", shortLabel: "赤字", value: Math.abs(profit), color: "#dc2626", category: "損失" });
  }

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const profitRate = profit / revenue;
  const costRate = (revenue - profit) / revenue;

  return (
    <div className="bg-white border border-slate-200 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">📊 売上100%の使い道（コスト構造）</h3>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-slate-500">コスト率: </span>
            <span className="font-bold text-orange-700 tabular-nums">{pct(costRate)}</span>
          </div>
          <div>
            <span className="text-slate-500">利益率: </span>
            <span className={`font-bold tabular-nums ${profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {pct(profitRate)}
            </span>
          </div>
        </div>
      </div>

      {/* 項目名ラベル段（セグメント幅が7%以上で表示） */}
      <div className="flex h-5 mt-3 text-[10px]">
        {segments.map((s, i) => {
          const w = (s.value / total) * 100;
          return (
            <div
              key={i}
              style={{ width: `${w}%` }}
              className="overflow-hidden text-center font-medium text-slate-700 px-0.5 truncate"
              title={s.label}
            >
              {w >= 7 ? s.shortLabel : ""}
            </div>
          );
        })}
      </div>

      {/* 横棒（％表示） */}
      <div className="flex h-12 rounded overflow-hidden border border-slate-300 bg-slate-100 shadow-sm">
        {segments.map((s, i) => {
          const w = (s.value / total) * 100;
          return (
            <div
              key={i}
              className="flex items-center justify-center text-[11px] text-white font-bold overflow-hidden border-r border-white/30 last:border-r-0 transition-opacity hover:opacity-90"
              style={{ width: `${w}%`, backgroundColor: s.color }}
              title={`${s.label}: ${yen(s.value)} (${pct(s.value / total)})`}
            >
              {w >= 5 ? pct(s.value / total) : ""}
            </div>
          );
        })}
      </div>

      {profit < 0 && (
        <div className="text-[10px] text-red-600 font-medium mt-1 text-right">
          ⚠ 100%超過: 赤字
        </div>
      )}

      {/* 凡例（金額順） */}
      <ul className="text-xs space-y-1 mt-4">
        {[...segments].sort((a, b) => b.value - a.value).map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border w-12 text-center ${
              s.category === "原価" ? "bg-amber-50 border-amber-300 text-amber-800" :
              s.category === "販管費" ? "bg-slate-50 border-slate-300 text-slate-700" :
              s.category === "利益" ? "bg-emerald-50 border-emerald-300 text-emerald-800" :
              "bg-red-50 border-red-300 text-red-800"
            }`}>{s.category}</span>
            <span className="flex-1 truncate">{s.label}</span>
            <span className="tabular-nums w-14 text-right text-slate-600">{pct(s.value / revenue)}</span>
            <span className="tabular-nums w-24 text-right font-medium">{yen(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
