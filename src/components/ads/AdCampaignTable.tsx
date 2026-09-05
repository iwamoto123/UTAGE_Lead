import type { CampaignRollup } from "@/lib/meta-ads";
import { cpa } from "@/lib/meta-ads";

const yen = (n: number | null) => (n === null ? "—" : `¥${Math.round(n).toLocaleString()}`);
const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(2)}%`);
const num = (n: number | null) => (n === null ? "—" : n.toLocaleString());

export default function AdCampaignTable({ rows }: { rows: CampaignRollup[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-6 text-center bg-white border border-dashed border-slate-200 rounded">
        この期間に配信データがありません
      </div>
    );
  }
  return (
    <div className="overflow-x-auto bg-white border border-slate-200 rounded">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            <th className="text-left px-3 py-2 font-medium">キャンペーン</th>
            <th className="text-right px-2 py-2 font-medium">消化金額</th>
            <th className="text-right px-2 py-2 font-medium">表示</th>
            <th className="text-right px-2 py-2 font-medium">クリック</th>
            <th className="text-right px-2 py-2 font-medium">CTR</th>
            <th className="text-right px-2 py-2 font-medium">CPC</th>
            <th className="text-right px-2 py-2 font-medium">LINE登録</th>
            <th className="text-right px-2 py-2 font-medium">獲得単価</th>
            <th className="text-right px-2 py-2 font-medium">成約</th>
            <th className="text-right px-2 py-2 font-medium">成約単価</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <CampaignRows key={r.campaignPageId ?? r.label} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignRows({ row }: { row: CampaignRollup }) {
  const t = row.totals;
  const showAdsets = row.adsets.length > 1;
  return (
    <>
      <tr className="border-t border-slate-200 hover:bg-slate-50">
        <td className="px-3 py-2">
          <div className="font-medium text-slate-800">{row.label}</div>
          <div className="text-[10px] text-slate-400">
            {row.firstDate}〜{row.lastDate}
            {!row.mapped && (
              <span className="ml-2 text-amber-600 border border-amber-300 rounded px-1">
                キャンペーン未対応
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-2 text-right tabular-nums font-medium">{yen(t.spend)}</td>
        <td className="px-2 py-2 text-right tabular-nums text-slate-500">{num(t.impressions)}</td>
        <td className="px-2 py-2 text-right tabular-nums">{num(t.clicks)}</td>
        <td className="px-2 py-2 text-right tabular-nums">{pct(t.ctr)}</td>
        <td className="px-2 py-2 text-right tabular-nums text-slate-500">{yen(t.cpc)}</td>
        <td className="px-2 py-2 text-right tabular-nums">{num(row.lineRegistrations)}</td>
        <td className="px-2 py-2 text-right tabular-nums">{yen(cpa(t.spend, row.lineRegistrations))}</td>
        <td className="px-2 py-2 text-right tabular-nums">{num(row.conversions)}</td>
        <td className="px-2 py-2 text-right tabular-nums">{yen(cpa(t.spend, row.conversions))}</td>
      </tr>
      {showAdsets &&
        row.adsets.map((a) => (
          <tr key={a.name} className="border-t border-slate-100 text-slate-500">
            <td className="px-3 py-1 pl-8 text-[11px]">└ {a.name}</td>
            <td className="px-2 py-1 text-right tabular-nums">{yen(a.totals.spend)}</td>
            <td className="px-2 py-1 text-right tabular-nums">{num(a.totals.impressions)}</td>
            <td className="px-2 py-1 text-right tabular-nums">{num(a.totals.clicks)}</td>
            <td className="px-2 py-1 text-right tabular-nums">{pct(a.totals.ctr)}</td>
            <td className="px-2 py-1 text-right tabular-nums">{yen(a.totals.cpc)}</td>
            <td className="px-2 py-1" colSpan={4} />
          </tr>
        ))}
    </>
  );
}
