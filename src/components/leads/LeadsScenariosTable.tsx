import type { ScenarioSummary } from "@/lib/marketing";
import { notionPageUrl } from "@/lib/notion";

const CAT_COLOR: Record<string, { text: string; bar: string }> = {
  "メタ広告":         { text: "text-[#458BC3]", bar: "bg-[#458BC3]" },
  "メタ広告(合流)":    { text: "text-blue-400", bar: "bg-blue-300" },
  "YouTube自然流入": { text: "text-red-700", bar: "bg-red-500" },
  "SNS自然流入":      { text: "text-purple-700", bar: "bg-purple-500" },
  "HP/ブログ":        { text: "text-cyan-700", bar: "bg-cyan-500" },
  "公式LINE":         { text: "text-emerald-700", bar: "bg-emerald-500" },
  "面談予約":         { text: "text-amber-700", bar: "bg-amber-500" },
};

const BIZ_BADGE: Record<string, string> = {
  "白谷塾オンライン": "bg-blue-100 text-blue-800 border-blue-300",
  "ローカルメディ":   "bg-emerald-100 text-emerald-800 border-emerald-300",
  "宮崎教室":         "bg-amber-100 text-amber-800 border-amber-300",
};

const PURE_CATEGORIES = new Set(["メタ広告", "YouTube自然流入", "SNS自然流入", "HP/ブログ", "公式LINE"]);

export default function LeadsScenariosTable({ scenarios, totalLeads }: { scenarios: ScenarioSummary[]; totalLeads: number }) {
  if (scenarios.length === 0) return null;

  const pureRows = scenarios
    .filter((s) => PURE_CATEGORIES.has(s.category))
    .sort((a, b) => b.periodTotal - a.periodTotal);
  const supplementalRows = scenarios
    .filter((s) => !PURE_CATEGORIES.has(s.category))
    .sort((a, b) => b.periodTotal - a.periodTotal);
  const sorted = [...pureRows, ...supplementalRows];

  return (
    <section className="bg-white border border-slate-200 rounded">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-bold">シナリオ別 優先順位</h2>
        <p className="text-[10px] text-slate-500 mt-0.5">純リード対象を上位表示。メタ広告(合流)・面談予約は補助指標として下段に分離</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-2 font-medium text-right">#</th>
              <th className="px-3 py-2 font-medium">事業</th>
              <th className="px-3 py-2 font-medium">経路</th>
              <th className="px-3 py-2 font-medium">区分</th>
              <th className="px-3 py-2 font-medium">シナリオ（アカウント / シナリオ名）</th>
              <th className="px-3 py-2 font-medium text-right">期間内</th>
              <th className="px-3 py-2 font-medium text-right">日平均</th>
              <th className="px-3 py-2 font-medium text-right">シェア</th>
              <th className="px-3 py-2 font-medium">判断</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, idx) => {
              const isPure = PURE_CATEGORIES.has(s.category);
              const pureRank = isPure ? pureRows.findIndex((r) => r.accountId === s.accountId && r.scenarioId === s.scenarioId) + 1 : null;
              const share = isPure && totalLeads > 0 ? (s.periodTotal / totalLeads) * 100 : 0;
              const col = CAT_COLOR[s.category] ?? { text: "text-slate-600", bar: "bg-slate-400" };
              const decision = scenarioDecision(s, isPure, share, pureRank ?? 999);
              const isSupplementStart = idx === pureRows.length && supplementalRows.length > 0;
              return (
                <tr key={`${s.accountId}|${s.scenarioId}`} className={`border-b border-slate-100 hover:bg-slate-50 ${isSupplementStart ? "border-t-2 border-t-slate-300" : ""}`}>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-400">{isPure ? pureRank : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${BIZ_BADGE[s.business] ?? ""}`}>
                      {s.business}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] font-bold ${col.text}`}>{s.category}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${isPure ? "bg-blue-50 text-[#458BC3]" : "bg-slate-50 text-slate-500"}`}>
                      {isPure ? "純リード" : "補助"}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-md">
                    <div className="truncate text-slate-700">{s.accountName}</div>
                    {s.scenarioName && <div className="text-[10px] text-slate-500 truncate">└ {s.scenarioName}</div>}
                    {s.campaigns.length > 0 && (
                      <div className="text-[10px] mt-0.5 flex flex-wrap gap-1">
                        {s.campaigns.map((c) => (
                          <a
                            key={c.pageId}
                            href={notionPageUrl(c.pageId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#458BC3] hover:underline truncate max-w-[14rem]"
                            title={c.name || c.pageId}
                          >
                            🔗 {c.name || "(企画ページ)"} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{s.periodTotal.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{s.dailyAverage}</td>
                  <td className="px-3 py-2 text-right">
                    {isPure ? (
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-14 bg-slate-100 h-1.5 rounded overflow-hidden">
                          <div className={`h-full ${col.bar}`} style={{ width: `${Math.min(100, share)}%` }} />
                        </div>
                        <span className="tabular-nums text-[10px] text-slate-500 w-10 text-right">{share.toFixed(1)}%</span>
                      </div>
                    ) : <span className="text-[10px] text-slate-400">除外</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${decision.className}`}>
                      {decision.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function scenarioDecision(s: ScenarioSummary, isPure: boolean, share: number, rank: number) {
  if (!isPure) {
    if (s.category === "メタ広告(合流)") return { label: "重複除外", className: "bg-blue-50 text-blue-400" };
    if (s.category === "面談予約") return { label: "予約数確認", className: "bg-amber-50 text-amber-700" };
    return { label: "補助", className: "bg-slate-50 text-slate-500" };
  }
  if (rank <= 3 || share >= 15) return { label: "主力", className: "bg-emerald-50 text-emerald-700" };
  if (share >= 5) return { label: "伸ばす候補", className: "bg-blue-50 text-[#458BC3]" };
  if (s.periodTotal > 0) return { label: "検証", className: "bg-slate-50 text-slate-600" };
  return { label: "停止候補", className: "bg-red-50 text-red-700" };
}
