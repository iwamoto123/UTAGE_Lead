import type { AccountSummary, LeadsPageData } from "@/lib/marketing";

type DailyTotal = LeadsPageData["dailyTotals"][number];

const BRAND = "#458BC3";

const SOURCE_LABELS: { key: keyof Pick<DailyTotal, "metaAd" | "youtube" | "sns" | "hpBlog" | "officialLine">; label: string; color: string }[] = [
  { key: "metaAd", label: "メタ広告", color: BRAND },
  { key: "youtube", label: "YouTube自然流入", color: "#dc2626" },
  { key: "sns", label: "SNS自然流入", color: "#7c3aed" },
  { key: "hpBlog", label: "HP/ブログ", color: "#0891b2" },
  { key: "officialLine", label: "公式LINE", color: "#059669" },
];

interface Props {
  data: LeadsPageData;
  comparisonData: LeadsPageData;
  fromDate: string;
  toDate: string;
  comparisonLabel: string;
  business: string;
}

export default function LeadsExecutiveSummary({ data, comparisonData, fromDate, toDate, comparisonLabel, business }: Props) {
  const current = summarize(data.dailyTotals);
  const previous = summarize(comparisonData.dailyTotals);
  const periodChange = previous.pureLeads > 0 ? ((current.pureLeads - previous.pureLeads) / previous.pureLeads) * 100 : null;
  const periodDiff = current.pureLeads - previous.pureLeads;
  const topSource = SOURCE_LABELS
    .map((s) => ({ ...s, value: current.sources[s.key] }))
    .sort((a, b) => b.value - a.value)[0];
  const businessRows = summarizeBusiness(data.accounts, current.pureLeads);
  const visibleBusinessRows = business === "all"
    ? businessRows
    : businessRows.filter((row) => row.name === business);
  const topAccounts = data.accounts
    .filter((a) => a.periodLeads > 0)
    .sort((a, b) => b.periodLeads - a.periodLeads)
    .slice(0, 3);
  const avgReservationRate = current.pureLeads > 0 ? current.reservations / current.pureLeads : 0;
  const watchAccounts = data.accounts
    .filter((a) => a.periodLeads >= 3 && a.periodReservations / a.periodLeads < avgReservationRate * 0.6)
    .sort((a, b) => b.periodLeads - a.periodLeads)
    .slice(0, 2);

  return (
    <section className="bg-white border border-slate-200 rounded">
      <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold">経営判断サマリ</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {fromDate}〜{toDate} / 純リードはメタ広告(合流)と面談予約を除外
          </p>
        </div>
        <div className="text-[10px] text-slate-500">
          前期間: {comparisonLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-200">
        <Kpi label="純リード" value={current.pureLeads.toLocaleString()} sub={`日平均 ${formatNumber(current.dailyAverage)}件`} tone="brand" />
        <Kpi label="面談予約" value={current.reservations.toLocaleString()} sub={`予約率 ${formatRate(current.reservationRate)}`} tone="amber" />
        <Kpi label="前期間差" value={formatDiff(periodDiff, periodChange)} sub={`前期間 ${previous.pureLeads.toLocaleString()}件`} tone={periodDiff >= 0 ? "emerald" : "red"} />
        <Kpi label="主要経路" value={topSource.value > 0 ? topSource.label : "データなし"} sub={topSource.value > 0 ? `${topSource.value.toLocaleString()}件 / ${formatRate(topSource.value / current.pureLeads)}` : "期間内リードなし"} tone="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold text-slate-700">事業別比較</h3>
            <span className="text-[10px] text-slate-500">白谷塾オンライン / ローカルメディ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] text-slate-500 border-b border-slate-100">
                  <th className="py-1 font-medium">事業</th>
                  <th className="py-1 font-medium text-right">純リード</th>
                  <th className="py-1 font-medium text-right">構成比</th>
                  <th className="py-1 font-medium text-right">面談予約</th>
                  <th className="py-1 font-medium text-right">予約率</th>
                  <th className="py-1 font-medium">主力アカウント</th>
                </tr>
              </thead>
              <tbody>
                {visibleBusinessRows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-50">
                    <td className="py-1.5 pr-2 font-medium">{row.name}</td>
                    <td className="py-1.5 text-right tabular-nums font-bold" style={{ color: BRAND }}>{row.leads.toLocaleString()}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">{formatRate(row.share)}</td>
                    <td className="py-1.5 text-right tabular-nums text-amber-700 font-bold">{row.reservations.toLocaleString()}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-700">{formatRate(row.reservationRate)}</td>
                    <td className="py-1.5 pl-3 max-w-[16rem] truncate text-slate-600" title={row.topAccount?.accountName}>
                      {row.topAccount?.accountName ?? "—"}
                    </td>
                  </tr>
                ))}
                {visibleBusinessRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400">集計対象の事業データがありません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-2">見るべき優先順位</h3>
          <div className="space-y-2 text-xs">
            <DecisionLine label="伸ばす" items={topAccounts.map((a) => `${shortName(a.accountName)} ${a.periodLeads.toLocaleString()}件`)} empty="期間内リードがありません" />
            <DecisionLine label="確認" items={watchAccounts.map((a) => `${shortName(a.accountName)} 予約率${formatRate(a.periodReservations / a.periodLeads)}`)} empty="予約率が大きく下振れた主要アカウントはありません" />
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500">
              重複リード {current.metaAdMerged.toLocaleString()}件は純リード・構成比・予約率から除外しています。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function summarize(dailyTotals: DailyTotal[]) {
  const sources = { metaAd: 0, youtube: 0, sns: 0, hpBlog: 0, officialLine: 0 };
  let reservations = 0;
  let metaAdMerged = 0;

  for (const d of dailyTotals) {
    sources.metaAd += d.metaAd;
    sources.youtube += d.youtube;
    sources.sns += d.sns;
    sources.hpBlog += d.hpBlog;
    sources.officialLine += d.officialLine;
    reservations += d.reservation;
    metaAdMerged += d.metaAdMerged;
  }

  const pureLeads = sources.metaAd + sources.youtube + sources.sns + sources.hpBlog + sources.officialLine;
  const periodDays = Math.max(1, dailyTotals.length);

  return {
    sources,
    pureLeads,
    reservations,
    metaAdMerged,
    reservationRate: pureLeads > 0 ? reservations / pureLeads : 0,
    dailyAverage: pureLeads / periodDays,
  };
}

function summarizeBusiness(accounts: AccountSummary[], totalPureLeads: number) {
  const rows = new Map<string, { name: string; leads: number; reservations: number; topAccount: AccountSummary | null }>();
  for (const account of accounts) {
    if (!rows.has(account.business)) rows.set(account.business, { name: account.business, leads: 0, reservations: 0, topAccount: null });
    const row = rows.get(account.business)!;
    row.leads += account.periodLeads;
    row.reservations += account.periodReservations;
    if (!row.topAccount || account.periodLeads > row.topAccount.periodLeads) row.topAccount = account;
  }
  return [...rows.values()]
    .map((row) => ({
      ...row,
      share: totalPureLeads > 0 ? row.leads / totalPureLeads : 0,
      reservationRate: row.leads > 0 ? row.reservations / row.leads : 0,
    }))
    .sort((a, b) => b.leads - a.leads);
}

function formatRate(v: number) {
  if (!Number.isFinite(v) || v <= 0) return "0.0%";
  return `${(v * 100).toFixed(1)}%`;
}

function formatDiff(diff: number, pct: number | null) {
  const sign = diff > 0 ? "+" : "";
  if (pct === null) return `${sign}${diff.toLocaleString()}件`;
  return `${sign}${diff.toLocaleString()}件 / ${sign}${pct.toFixed(1)}%`;
}

function formatNumber(v: number) {
  return v.toFixed(1);
}

function shortName(name: string) {
  return name.replace(/【.*?】/g, "").replace("白谷塾オンライン教室", "白谷塾").trim();
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "brand" | "amber" | "emerald" | "red" | "slate" }) {
  const toneClass = {
    brand: "text-[#458BC3]",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
    red: "text-red-700",
    slate: "text-slate-900",
  }[tone];
  return (
    <div className="px-4 py-3 border-r border-b last:border-r-0 lg:border-b-0 border-slate-200">
      <div className="text-[10px] text-slate-500 font-medium">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}

function DecisionLine({ label, items, empty }: { label: string; items: string[]; empty: string }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-2">
      <div className="text-[10px] font-bold text-slate-500 pt-0.5">{label}</div>
      <div className="flex gap-1.5 flex-wrap">
        {items.length > 0 ? items.map((item) => (
          <span key={item} className="px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700">
            {item}
          </span>
        )) : <span className="text-slate-400">{empty}</span>}
      </div>
    </div>
  );
}
