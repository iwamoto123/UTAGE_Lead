import type { CampaignFunnelRow } from "@/lib/marketing";

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "−";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default function CampaignFunnelTable({ rows }: { rows: CampaignFunnelRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
        この期間内にキャンペーン別のファネルデータがありません。
      </div>
    );
  }

  // 事業別にグループ
  const byBusiness = new Map<string, CampaignFunnelRow[]>();
  for (const r of rows) {
    if (!byBusiness.has(r.business)) byBusiness.set(r.business, []);
    byBusiness.get(r.business)!.push(r);
  }

  return (
    <div className="bg-white border border-slate-200 rounded overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="font-bold">📋 キャンペーン別 ファネル</h2>
        <span className="text-xs text-slate-500">期間内合計</span>
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">キャンペーン名</th>
              <th className="text-left px-3 py-2 font-semibold">事業</th>
              <th className="text-right px-3 py-2 font-semibold">リード</th>
              <th className="text-right px-3 py-2 font-semibold">面談</th>
              <th className="text-right px-3 py-2 font-semibold">体験</th>
              <th className="text-right px-3 py-2 font-semibold">入塾</th>
              <th className="text-right px-3 py-2 font-semibold text-emerald-700">面談率</th>
              <th className="text-right px-3 py-2 font-semibold text-emerald-700">体験率</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(byBusiness.entries()).map(([biz, bizRows]) => (
              bizRows.map((r, i) => (
                <tr key={`${biz}-${i}`} className="border-t border-slate-100">
                  <td className="px-3 py-1.5">{r.campaignName}</td>
                  <td className="px-3 py-1.5 text-slate-600">{r.business}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.leadCount > 0 ? r.leadCount : <span className="text-slate-300">−</span>}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.consultationCount > 0 ? r.consultationCount : <span className="text-slate-300">−</span>}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.trialCount > 0 ? r.trialCount : <span className="text-slate-300">−</span>}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.enrollmentCount > 0 ? r.enrollmentCount : <span className="text-slate-300">−</span>}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{pct(r.consultationCount, r.leadCount)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{pct(r.trialCount, r.consultationCount)}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
