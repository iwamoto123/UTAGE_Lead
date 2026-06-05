import type { AccountSummary } from "@/lib/marketing";
import { notionPageUrl } from "@/lib/notion";

const BIZ_BADGE: Record<string, string> = {
  "白谷塾オンライン": "bg-blue-100 text-blue-800 border-blue-300",
  "ローカルメディ":   "bg-emerald-100 text-emerald-800 border-emerald-300",
  "宮崎教室":         "bg-amber-100 text-amber-800 border-amber-300",
};

const CAT_BADGE: Record<string, string> = {
  "メタ広告":         "bg-blue-50 text-[#458BC3]",
  "メタ広告(合流)":    "bg-blue-50 text-blue-400",
  "YouTube自然流入": "bg-red-50 text-red-700",
  "SNS自然流入":      "bg-purple-50 text-purple-700",
  "HP/ブログ":        "bg-cyan-50 text-cyan-700",
  "公式LINE":         "bg-emerald-50 text-emerald-700",
  "混在":             "bg-violet-50 text-violet-700",
  "面談予約":         "bg-amber-50 text-amber-700",
  "教材販売":         "bg-yellow-50 text-yellow-800",
  "集計外":           "bg-slate-50 text-slate-500",
};

const CAT_ORDER: Record<string, number> = {
  "メタ広告": 1, "メタ広告(合流)": 1.5, "混在": 2, "YouTube自然流入": 3,
  "SNS自然流入": 3.5, "HP/ブログ": 3.7, "公式LINE": 4, "面談予約": 5,
  "教材販売": 6, "集計外": 9,
};

export default function LeadsAccountsTable({ accounts }: { accounts: AccountSummary[] }) {
  if (accounts.length === 0) return null;

  // 経営判断しやすいよう、期間内の純リードが多い順に並べる
  const sorted = [...accounts].sort((a, b) => {
    const leadOrder = b.periodLeads - a.periodLeads;
    if (leadOrder !== 0) return leadOrder;
    const reservationOrder = b.periodReservations - a.periodReservations;
    if (reservationOrder !== 0) return reservationOrder;
    const categoryOrder = (CAT_ORDER[a.category] ?? 99) - (CAT_ORDER[b.category] ?? 99);
    if (categoryOrder !== 0) return categoryOrder;
    return b.cumulativeTotal - a.cumulativeTotal;
  });

  const totalCum = accounts.reduce((s, a) => s + a.cumulativeTotal, 0);
  const totalPeriod = accounts.reduce((s, a) => s + a.periodLeads, 0);
  const totalReservation = accounts.reduce((s, a) => s + a.periodReservations, 0);
  const averageReservationRate = totalPeriod > 0 ? totalReservation / totalPeriod : 0;

  return (
    <section className="bg-white border border-slate-200 rounded">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-bold">アカウント別 判断表</h2>
        <p className="text-[10px] text-slate-500 mt-0.5">純リード順。予約率が低い主要アカウントは導線・オファー・LPの確認対象</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-2 font-medium">事業</th>
              <th className="px-3 py-2 font-medium">経路</th>
              <th className="px-3 py-2 font-medium">アカウント名</th>
              <th className="px-3 py-2 font-medium">紐付け企画</th>
              <th className="px-3 py-2 font-medium text-right">累計登録</th>
              <th className="px-3 py-2 font-medium text-right">純リード</th>
              <th className="px-3 py-2 font-medium text-right">面談予約</th>
              <th className="px-3 py-2 font-medium text-right">予約率</th>
              <th className="px-3 py-2 font-medium text-right">構成比</th>
              <th className="px-3 py-2 font-medium">判断</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const leadShare = totalPeriod > 0 ? (a.periodLeads / totalPeriod) * 100 : 0;
              const reservationRate = a.periodLeads > 0 ? (a.periodReservations / a.periodLeads) * 100 : 0;
              const decision = accountDecision(a, totalPeriod, averageReservationRate);
              return (
                <tr key={a.accountId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${BIZ_BADGE[a.business] ?? ""}`}>
                      {a.business}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${CAT_BADGE[a.category] ?? "bg-slate-50 text-slate-600"}`}>
                      {a.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-md truncate" title={a.accountName}>{a.accountName}</td>
                  <td className="px-3 py-2 max-w-xs">
                    {a.campaigns.length === 0 ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {a.campaigns.map((c) => (
                          <a
                            key={c.pageId}
                            href={notionPageUrl(c.pageId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#458BC3] hover:underline truncate max-w-[14rem]"
                            title={c.name || c.pageId}
                          >
                            {c.name || "(企画ページ)"} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{a.cumulativeTotal.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {a.periodLeads > 0 ? <span className="text-[#458BC3] font-bold">{a.periodLeads.toLocaleString()}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {a.periodReservations > 0 ? <span className="text-amber-700">{a.periodReservations.toLocaleString()}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-[10px] text-slate-600 tabular-nums">
                    {a.periodLeads > 0 ? `${reservationRate.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-[10px] text-slate-600 tabular-nums">
                    {leadShare > 0 ? `${leadShare.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${decision.className}`}>
                      {decision.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={4} className="px-3 py-2">合計</td>
              <td className="px-3 py-2 text-right tabular-nums">{totalCum.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[#458BC3]">{totalPeriod.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-amber-700">{totalReservation.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                {totalPeriod > 0 ? `${((totalReservation / totalPeriod) * 100).toFixed(1)}%` : "—"}
              </td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function accountDecision(account: AccountSummary, totalPeriod: number, averageReservationRate: number) {
  if (account.periodLeads === 0 && account.periodReservations === 0) {
    return { label: "対象外", className: "bg-slate-50 text-slate-400" };
  }
  if (account.periodLeads === 0 && account.periodReservations > 0) {
    return { label: "予約導線", className: "bg-amber-50 text-amber-700" };
  }
  const share = totalPeriod > 0 ? account.periodLeads / totalPeriod : 0;
  const rate = account.periodReservations / account.periodLeads;
  if (share >= 0.15 && rate >= averageReservationRate) {
    return { label: "主力", className: "bg-emerald-50 text-emerald-700" };
  }
  if (share >= 0.1 && rate < averageReservationRate * 0.6) {
    return { label: "要確認", className: "bg-red-50 text-red-700" };
  }
  if (rate > averageReservationRate * 1.4 && account.periodReservations >= 2) {
    return { label: "伸ばす候補", className: "bg-blue-50 text-[#458BC3]" };
  }
  return { label: "検証", className: "bg-slate-50 text-slate-600" };
}
