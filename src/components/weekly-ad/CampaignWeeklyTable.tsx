import type { CampaignWithReports } from "@/lib/weekly-ad";

const MEDIUM_BADGE: Record<string, string> = {
  "メタ広告":    "bg-blue-50 text-blue-700",
  "Google広告":  "bg-red-50 text-red-700",
  "メインLINE":  "bg-emerald-50 text-emerald-700",
  "YouTube":     "bg-rose-50 text-rose-700",
  "(未設定)":     "bg-slate-50 text-slate-500",
};

const STATUS_BADGE: Record<string, string> = {
  "実施中":  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "計画中":  "bg-amber-100 text-amber-800 border-amber-300",
  "終了":    "bg-slate-100 text-slate-600 border-slate-300",
  "(未設定)": "bg-slate-50 text-slate-500 border-slate-200",
};

const BIZ_BADGE: Record<string, string> = {
  "白谷塾オンライン": "bg-[#458BC3]/10 text-[#458BC3]",
  "ローカルメディ":   "bg-emerald-100 text-emerald-800",
  "宮崎教室":         "bg-amber-100 text-amber-800",
  "その他":           "bg-slate-100 text-slate-600",
};

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`;
}

function pct(n: number | null): string {
  if (n === null || !isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function periodLabel(start: string | null, end: string | null): string {
  if (!start) return "—";
  const s = start.slice(5).replace("-", "/");
  if (!end || end === start) return s;
  return `${s}〜${end.slice(5).replace("-", "/")}`;
}

export default function CampaignWeeklyTable({ row }: { row: CampaignWithReports }) {
  const { campaign, reports, totals } = row;
  return (
    <section className="bg-white border border-slate-200 rounded">
      <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_BADGE[campaign.status] ?? STATUS_BADGE["(未設定)"]}`}>
              {campaign.status}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${MEDIUM_BADGE[campaign.medium] ?? MEDIUM_BADGE["(未設定)"]}`}>
              {campaign.medium}
            </span>
            {campaign.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{campaign.category}</span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${BIZ_BADGE[campaign.business] ?? BIZ_BADGE["その他"]}`}>
              {campaign.business}
            </span>
            {campaign.year && (
              <span className="text-[10px] text-slate-400">{campaign.year}</span>
            )}
          </div>
          <h3 className="text-sm font-bold mt-1 truncate">
            {campaign.url ? (
              <a href={campaign.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {campaign.name} ↗
              </a>
            ) : (
              campaign.name
            )}
          </h3>
        </div>
        <div className="text-[10px] text-slate-500 text-right tabular-nums shrink-0">
          <div>累計 {reports.length}週</div>
          <div className="text-slate-900 font-bold text-sm">{yen(totals.spend)}</div>
          <div>{totals.lineRegistrations.toLocaleString()} 件 / CPA {totals.cpa !== null ? yen(totals.cpa) : "—"}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-2 font-medium">期間</th>
              <th className="px-3 py-2 font-medium text-right">消化金額</th>
              <th className="px-3 py-2 font-medium text-right">クリック</th>
              <th className="px-3 py-2 font-medium text-right">CTR</th>
              <th className="px-3 py-2 font-medium text-right">LINE登録</th>
              <th className="px-3 py-2 font-medium text-right">CPA</th>
              <th className="px-3 py-2 font-medium text-right">登録率</th>
              <th className="px-3 py-2 font-medium text-right">成約</th>
              <th className="px-3 py-2 font-medium text-right">成約率</th>
              <th className="px-3 py-2 font-medium">メモ</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const cpa = r.lineRegistrations > 0 ? r.spend / r.lineRegistrations : null;
              const lineRate = r.clicks > 0 ? r.lineRegistrations / r.clicks : null;
              const convRate = r.lineRegistrations > 0 ? r.conversions / r.lineRegistrations : null;
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-700">
                      {periodLabel(r.periodStart, r.periodEnd)}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(r.spend)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.clicks.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{pct(r.ctr)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-[#458BC3]">{r.lineRegistrations.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{cpa !== null ? yen(cpa) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{pct(lineRate)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.conversions || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{pct(convRate)}</td>
                  <td className="px-3 py-2 max-w-xs truncate text-slate-500" title={r.memo}>{r.memo || "—"}</td>
                </tr>
              );
            })}
            {/* 合計 */}
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
              <td className="px-3 py-2">合計</td>
              <td className="px-3 py-2 text-right tabular-nums">{yen(totals.spend)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{totals.clicks.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-500">{pct(totals.ctr)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[#458BC3]">{totals.lineRegistrations.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{totals.cpa !== null ? yen(totals.cpa) : "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-500">{pct(totals.lineRate)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{totals.conversions || "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-500">{pct(totals.conversionRate)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
