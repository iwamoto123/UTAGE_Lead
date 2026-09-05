import {
  getMetaDaily, filterByRange, sumRows, byMonth, byCampaign, cpa,
} from "@/lib/meta-ads";
import { getCampaignMaster, getWeeklyAdReports } from "@/lib/weekly-ad";
import AdPeriodControls, { type AdPeriodKey } from "@/components/ads/AdPeriodControls";
import AdCampaignTable from "@/components/ads/AdCampaignTable";

type SP = Promise<{ period?: string; from?: string; to?: string }>;

export default async function AdsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const period = normalizePeriod(sp.period);

  const [daily, campaigns, weekly] = await Promise.all([
    getMetaDaily(),
    getCampaignMaster(),
    getWeeklyAdReports(),
  ]);

  if (daily.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold">広告レポート</h1>
        <div className="text-xs text-slate-500 bg-white border border-dashed border-slate-200 rounded p-6 text-center">
          Meta広告 日次実績DBにデータがありません。meta-ads-sync の同期を実行してください。
        </div>
      </div>
    );
  }

  const dates = daily.map((d) => d.date).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  const { from, to } = resolveRange(period, sp.from, sp.to, minDate, maxDate);

  const rows = filterByRange(daily, from, to);
  const totals = sumRows(rows);
  const months = byMonth(rows);

  // LINE登録・成約は週次広告レポート側が正本（手入力の履歴もここに入っている）
  const lineByCampaign = new Map<string, number>();
  const convByCampaign = new Map<string, number>();
  for (const r of weekly) {
    if (!r.periodStart || r.periodStart < from || r.periodStart > to) continue;
    for (const cid of r.campaignPageIds) {
      lineByCampaign.set(cid, (lineByCampaign.get(cid) ?? 0) + r.lineRegistrations);
      convByCampaign.set(cid, (convByCampaign.get(cid) ?? 0) + r.conversions);
    }
  }
  const campaignNames = new Map(campaigns.map((c) => [c.id, c.name]));
  const grouped = byCampaign(rows, campaignNames, lineByCampaign, convByCampaign);

  const totalLine = [...lineByCampaign.values()].reduce((a, b) => a + b, 0);
  const totalConv = [...convByCampaign.values()].reduce((a, b) => a + b, 0);
  const unmapped = grouped.filter((g) => !g.mapped);
  const maxMonthSpend = Math.max(...months.map((m) => m.totals.spend), 1);

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold">広告レポート</h1>
            <p className="text-xs text-slate-500">
              Meta広告マネージャの実績（{minDate}〜{maxDate}）。毎朝8:20に自動更新
            </p>
          </div>
          <AdPeriodControls active={period} from={from} to={to} minDate={minDate} maxDate={maxDate} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <Kpi label="消化金額" value={`¥${Math.round(totals.spend).toLocaleString()}`} emphasis />
          <Kpi label="表示回数" value={totals.impressions.toLocaleString()} />
          <Kpi label="クリック" value={totals.clicks.toLocaleString()} />
          <Kpi label="CTR" value={totals.ctr !== null ? `${(totals.ctr * 100).toFixed(2)}%` : "—"} />
          <Kpi label="LINE登録" value={totalLine.toLocaleString()} />
          <Kpi label="LINE獲得単価" value={fmtYen(cpa(totals.spend, totalLine))} emphasis />
          <Kpi label="成約単価" value={fmtYen(cpa(totals.spend, totalConv))} />
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-700">月次推移</h2>
        <div className="bg-white border border-slate-200 rounded overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="text-left px-3 py-2 font-medium">月</th>
                <th className="text-right px-2 py-2 font-medium">消化金額</th>
                <th className="text-left px-2 py-2 font-medium w-1/3">構成</th>
                <th className="text-right px-2 py-2 font-medium">クリック</th>
                <th className="text-right px-2 py-2 font-medium">CTR</th>
                <th className="text-right px-2 py-2 font-medium">CPC</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-t border-slate-200">
                  <td className="px-3 py-1.5 font-medium">{m.month}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    ¥{Math.round(m.totals.spend).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="h-2 bg-[#458BC3] rounded-sm"
                      style={{ width: `${(m.totals.spend / maxMonthSpend) * 100}%` }} />
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m.totals.clicks.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {m.totals.ctr !== null ? `${(m.totals.ctr * 100).toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-500">
                    {fmtYen(m.totals.cpc)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-slate-700">キャンペーン別 {grouped.length}件</h2>
        <p className="text-[11px] text-slate-500">
          消化金額・クリック・CTRはMeta広告マネージャから直接取得。LINE登録と成約は週次広告レポートの値。
          広告セットが複数ある場合は内訳を下に並べています。
        </p>
        <AdCampaignTable rows={grouped} />
      </section>

      {unmapped.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded p-3 space-y-1">
          <h3 className="text-xs font-bold text-amber-800">
            キャンペーンマスター未対応 {unmapped.length}件
          </h3>
          <p className="text-[11px] text-amber-700">
            Notionのキャンペーンマスターに「Meta広告キャンペーンID」が登録されていないため、
            LINE登録・成約と突き合わせできません。
          </p>
          <ul className="text-[11px] text-amber-800 list-disc pl-4">
            {unmapped.map((u) => (
              <li key={u.label}>{u.label}（消化 ¥{Math.round(u.totals.spend).toLocaleString()}）</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function fmtYen(n: number | null): string {
  return n === null ? "—" : `¥${Math.round(n).toLocaleString()}`;
}

function Kpi({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded px-3 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${emphasis ? "text-[#458BC3]" : ""}`}>{value}</div>
    </div>
  );
}

function normalizePeriod(v: string | undefined): AdPeriodKey {
  const keys: AdPeriodKey[] = ["last30days", "last90days", "thisFY", "all", "custom"];
  return keys.includes(v as AdPeriodKey) ? (v as AdPeriodKey) : "last90days";
}

/** 年度は4月はじまり。データの最終日を基準にする（今日だと未同期の日で空になるため） */
function resolveRange(
  period: AdPeriodKey, spFrom: string | undefined, spTo: string | undefined,
  minDate: string, maxDate: string,
): { from: string; to: string } {
  if (period === "custom" && spFrom && spTo) return { from: spFrom, to: spTo };
  if (period === "all") return { from: minDate, to: maxDate };
  if (period === "thisFY") {
    const [y, m] = maxDate.split("-").map(Number);
    const fyStart = `${m >= 4 ? y : y - 1}-04-01`;
    return { from: fyStart < minDate ? minDate : fyStart, to: maxDate };
  }
  const days = period === "last30days" ? 30 : 90;
  const d = new Date(`${maxDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  const from = d.toISOString().slice(0, 10);
  return { from: from < minDate ? minDate : from, to: maxDate };
}
