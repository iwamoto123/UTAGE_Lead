import fs from "fs";
import path from "path";
import { getUtageDailyLeads, getSourceCampaignEntries, getCampaignNameEntries, summarizeLeadsPage, R8_FUNNEL_START_YM, type UtageDailyLead } from "@/lib/marketing";
import { LEAD_ACCOUNT_SECTIONS, type LeadAccountSection } from "@/lib/leads-groups";
import BusinessTabs from "@/components/BusinessTabs";
import LeadsAccountsTable from "@/components/leads/LeadsAccountsTable";
import LeadsScenariosTable from "@/components/leads/LeadsScenariosTable";
import LeadsDailyChart from "@/components/leads/LeadsDailyChart";
import LeadsTrackingAnalysis, { type ScenarioTracking } from "@/components/leads/LeadsTrackingAnalysis";
import LeadsExecutiveSummary from "@/components/leads/LeadsExecutiveSummary";
import LeadsDateRangeControls, { type LeadsPeriodKey } from "@/components/leads/LeadsDateRangeControls";
import LeadsRouteBreakdownTable from "@/components/leads/LeadsRouteBreakdownTable";
import UtageSyncButton from "@/components/UtageSyncButton";

type SP = Promise<{ period?: string; business?: string; from?: string; to?: string }>;

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const period = normalizePeriod(sp.period);
  const business = (sp.business ?? "all") as "all" | "宮崎教室" | "白谷塾オンライン" | "ローカルメディ";

  const [utageLeads, campaignEntries, campaignNameEntries] = await Promise.all([
    getUtageDailyLeads(),
    getSourceCampaignEntries(),
    getCampaignNameEntries(),
  ]);
  const campaignMap = new Map<string, string[]>(campaignEntries);
  const campaignNames = new Map<string, string>(campaignNameEntries);
  const accountTotalsPath = path.join(process.cwd(), "scripts/utage-account-totals.json");
  const accountTotalsRaw = fs.readFileSync(accountTotalsPath, "utf8");
  const accountTotalsJson = JSON.parse(accountTotalsRaw) as {
    accounts: { id: string; name: string; category: string; business: string; total: number }[];
  };
  const accountBusinessById = new Map(accountTotalsJson.accounts.map((account) => [account.id, account.business]));

  // 流入元分析
  const trackingPath = path.join(process.cwd(), "scripts/utage-tracking-totals.json");
  let trackingScenarios: ScenarioTracking[] = [];
  if (fs.existsSync(trackingPath)) {
    const trackingJson = JSON.parse(fs.readFileSync(trackingPath, "utf8")) as { scenarios?: ScenarioTracking[] };
    trackingScenarios = trackingJson.scenarios ?? [];
  }

  const latestDataDate = latestLeadDate(utageLeads) ?? todayDate();
  const range = getLeadsDateRange(period, sp.from, sp.to, latestDataDate);
  const previousRange = getPreviousRange(range.fromDate, range.toDate);
  const filteredSections = filterLeadAccountSections(LEAD_ACCOUNT_SECTIONS, accountBusinessById, business);
  const filteredTrackingScenarios = filterTrackingScenarios(trackingScenarios, accountBusinessById, business);
  const unclassifiedSources = findUnclassifiedLeadSources(utageLeads, range.fromDate, range.toDate);

  const data = summarizeLeadsPage(
    utageLeads,
    accountTotalsJson.accounts,
    range.fromDate,
    range.toDate,
    business,
    campaignMap,
    campaignNames,
  );
  const comparisonData = summarizeLeadsPage(
    utageLeads,
    accountTotalsJson.accounts,
    previousRange.fromDate,
    previousRange.toDate,
    business,
    campaignMap,
    campaignNames,
  );

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex flex-col gap-3">
        <BusinessTabs active={business} period={period} from={range.fromDate} to={range.toDate} basePath="/leads" />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <LeadsDateRangeControls
            active={period}
            business={business}
            from={range.fromDate}
            to={range.toDate}
            minDate={R8_START_DATE}
            maxDate={latestDataDate}
          />
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">{range.fromDate}〜{range.toDate}</div>
            <UtageSyncButton />
          </div>
        </div>
      </div>

      <LeadsExecutiveSummary
        data={data}
        comparisonData={comparisonData}
        fromDate={range.fromDate}
        toDate={range.toDate}
        comparisonLabel={`${previousRange.fromDate}〜${previousRange.toDate}`}
        business={business}
      />

      <LeadsRouteBreakdownTable
        sections={filteredSections}
        data={data}
        comparisonData={comparisonData}
        allLeads={utageLeads}
        dates={range.dates}
      />

      {/* 経路カテゴリ別サマリ */}
      <div className="bg-white border border-slate-200 rounded">
        <div className="border-b border-slate-200 px-4 py-2">
          <h2 className="text-sm font-bold">経路カテゴリ別サマリ</h2>
          <p className="text-[10px] text-slate-500">{range.fromDate}〜{range.toDate} の新規LINE登録数。純リード合計は合流・面談予約を除外</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 p-4 text-center">
          <SummaryCell label="メタ広告" value={data.dailyTotals.reduce((s, d) => s + d.metaAd, 0)} color="text-[#458BC3]" />
          <SummaryCell label="メタ広告(合流)" value={data.dailyTotals.reduce((s, d) => s + d.metaAdMerged, 0)} color="text-blue-400" sub="重複" />
          <SummaryCell label="YouTube自然流入" value={data.dailyTotals.reduce((s, d) => s + d.youtube, 0)} color="text-red-700" />
          <SummaryCell label="SNS自然流入" value={data.dailyTotals.reduce((s, d) => s + d.sns, 0)} color="text-purple-700" />
          <SummaryCell label="HP/ブログ" value={data.dailyTotals.reduce((s, d) => s + d.hpBlog, 0)} color="text-cyan-700" />
          <SummaryCell label="公式LINE" value={data.dailyTotals.reduce((s, d) => s + d.officialLine, 0)} color="text-emerald-700" />
          <SummaryCell label="面談予約" value={data.dailyTotals.reduce((s, d) => s + d.reservation, 0)} color="text-amber-700" />
          <SummaryCell label="純リード合計" value={
            data.dailyTotals.reduce((s, d) => s + d.metaAd + d.youtube + d.sns + d.hpBlog + d.officialLine, 0)
          } color="text-slate-900" big />
        </div>
        <div className="px-4 pb-3 text-[10px] text-slate-500">
          期間内追加は Notion「UTAGE 日次リード数」を集計。メタ広告(合流)は他導線との重複のため、純リード・構成比・予約率から除外
        </div>
      </div>

      {/* 日別グラフ */}
      <LeadsDailyChart
        dailyTotals={data.dailyTotals}
        dailyByScenario={Object.fromEntries(data.dailyByScenario)}
        scenarios={data.scenarios}
      />

      <details className="bg-white border border-slate-200 rounded p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">詳細一覧（旧形式）</summary>
        <div className="mt-3 space-y-4">
          <LeadsAccountsTable accounts={data.accounts} />
          <LeadsScenariosTable scenarios={data.scenarios} totalLeads={
            data.dailyTotals.reduce((s, d) => s + d.metaAd + d.youtube + d.sns + d.hpBlog + d.officialLine, 0)
          } />
        </div>
      </details>

      <UnclassifiedLeadSourcesAlert sources={unclassifiedSources} />

      {/* 流入元分析 */}
      <LeadsTrackingAnalysis scenarios={filteredTrackingScenarios} />

      {/* データソース */}
      <details className="bg-white border border-slate-200 rounded p-3 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">📚 データソース</summary>
        <div className="text-[11px] text-slate-600 mt-2 space-y-1">
          <p>• <strong>累計登録者数</strong>＝UTAGE の <code>message_reader_list_all</code> の meta.total（全シナリオ合計のため、ユニーク人数ではない可能性あり）</p>
          <p>• <strong>期間内追加</strong>＝Notion 「UTAGE 日次リード数」DB を期間で絞った合計（メタ広告 / YouTube自然流入 / SNS自然流入 / HP・ブログ / 公式LINE）</p>
          <p>• <strong>面談予約</strong>＝Notion 経路カテゴリ「面談予約」シナリオ（=Zoom面談予約完了直後）</p>
          <p>• <strong>シナリオ分類</strong>＝<code>scripts/utage-account-totals.json</code> + Notion「UTAGE 流入経路マスター」DB</p>
          <p>• リード集計は 2026-01-01 以降（R8期）。選択期間がそれ以前を含む場合も 2026-01-01 から集計</p>
        </div>
      </details>
    </div>
  );
}

const R8_START_DATE = `${R8_FUNNEL_START_YM}-01`;

function normalizePeriod(value: string | undefined): LeadsPeriodKey {
  if (value === "last14days" || value === "last30days" || value === "custom") return value;
  return "last7days";
}

function getLeadsDateRange(period: LeadsPeriodKey, from: string | undefined, to: string | undefined, latestDataDate: string) {
  if (period === "custom") {
    const customFrom = isValidDate(from) ? from : shiftDate(latestDataDate, -6);
    const customTo = isValidDate(to) ? to : latestDataDate;
    return normalizeRange(customFrom, customTo);
  }

  const days = period === "last30days" ? 30 : period === "last14days" ? 14 : 7;
  return normalizeRange(shiftDate(latestDataDate, -(days - 1)), latestDataDate);
}

function getPreviousRange(fromDate: string, toDate: string) {
  const length = enumerateDates(fromDate, toDate).length || 1;
  return normalizeRange(shiftDate(fromDate, -length), shiftDate(fromDate, -1), false);
}

function normalizeRange(fromDate: string, toDate: string, clampR8 = true) {
  let [a, b] = fromDate <= toDate ? [fromDate, toDate] : [toDate, fromDate];
  if (clampR8 && a < R8_START_DATE) a = R8_START_DATE;
  if (clampR8 && b < R8_START_DATE) b = R8_START_DATE;
  return { fromDate: a, toDate: b, dates: enumerateDates(a, b) };
}

function latestLeadDate(leads: UtageDailyLead[]): string | null {
  return leads
    .map((lead) => lead.date)
    .filter((date) => date >= R8_START_DATE)
    .sort()
    .at(-1) ?? null;
}

function todayDate() {
  const d = new Date();
  return formatDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
}

function isValidDate(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shiftDate(date: string, offsetDays: number) {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return formatDate(d);
}

function enumerateDates(fromDate: string, toDate: string): string[] {
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const start = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));
  if (start > end) return [];
  const dates: string[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(formatDate(d));
  }
  return dates;
}

function formatDate(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function SummaryCell({ label, value, color, big, sub }: { label: string; value: number; color: string; big?: boolean; sub?: string }) {
  return (
    <div className="px-2">
      <div className="text-[10px] text-slate-500">
        {label}
        {sub && <span className="ml-1 text-[9px] text-slate-400">({sub})</span>}
      </div>
      <div className={`${big ? "text-3xl" : "text-2xl"} font-bold tabular-nums ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function filterLeadAccountSections(
  sections: LeadAccountSection[],
  accountBusinessById: Map<string, string>,
  business: "all" | "宮崎教室" | "白谷塾オンライン" | "ローカルメディ",
): LeadAccountSection[] {
  return sections
    .map((section) => ({
      ...section,
      accounts: section.accounts.filter((account) => matchLeadBusiness(accountBusinessById.get(account.id) ?? null, business)),
    }))
    .filter((section) => section.accounts.length > 0);
}

function filterTrackingScenarios(
  scenarios: ScenarioTracking[],
  accountBusinessById: Map<string, string>,
  business: "all" | "宮崎教室" | "白谷塾オンライン" | "ローカルメディ",
) {
  return scenarios.filter((scenario) => matchLeadBusiness(accountBusinessById.get(scenario.account_id) ?? null, business));
}

function matchLeadBusiness(
  value: string | null,
  business: "all" | "宮崎教室" | "白谷塾オンライン" | "ローカルメディ",
) {
  if (business === "all") return value === "白谷塾オンライン" || value === "ローカルメディ";
  return value === business;
}

interface UnclassifiedLeadSource {
  key: string;
  accountId: string;
  scenarioId: string;
  accountName: string;
  scenarioName: string;
  category: string;
  business: string;
  count: number;
}

function findUnclassifiedLeadSources(utageLeads: UtageDailyLead[], fromDate: string, toDate: string): UnclassifiedLeadSource[] {
  const map = new Map<string, UnclassifiedLeadSource>();
  for (const lead of utageLeads) {
    if (lead.date < fromDate || lead.date > toDate || lead.count <= 0) continue;
    if (!needsClassification(lead)) continue;

    const key = `${lead.accountId}|${lead.scenarioId}`;
    const current = map.get(key) ?? {
      key,
      accountId: lead.accountId,
      scenarioId: lead.scenarioId,
      accountName: lead.accountName,
      scenarioName: lead.scenarioName,
      category: lead.category,
      business: lead.business ?? "未設定",
      count: 0,
    };
    current.accountName = lead.accountName || current.accountName;
    current.scenarioName = lead.scenarioName || current.scenarioName;
    current.category = lead.category;
    current.business = lead.business ?? "未設定";
    current.count += lead.count;
    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}

function needsClassification(lead: UtageDailyLead) {
  if (lead.category === "未分類") return true;
  if (lead.category === "集計外") return false;
  return lead.business !== "白谷塾オンライン" && lead.business !== "ローカルメディ" && lead.business !== "宮崎教室";
}

function UnclassifiedLeadSourcesAlert({ sources }: { sources: UnclassifiedLeadSource[] }) {
  if (sources.length === 0) return null;

  return (
    <section className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
      <div className="font-bold">分類確認が必要な流入があります</div>
      <p className="mt-1 text-xs">
        以下は事業または経路カテゴリが未確定のため、事業別集計から除外しています。白谷塾オンライン / ローカルメディ / 集計外 のどれに入れるか確認してください。
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left border-b border-amber-200">
              <th className="py-1 pr-3 font-medium">アカウント</th>
              <th className="py-1 pr-3 font-medium">シナリオ</th>
              <th className="py-1 pr-3 font-medium">現在の分類</th>
              <th className="py-1 pr-3 font-medium text-right">期間内追加</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.key} className="border-b border-amber-100 last:border-0">
                <td className="py-1.5 pr-3">{source.accountName || source.accountId}</td>
                <td className="py-1.5 pr-3">{source.scenarioName || source.scenarioId || "-"}</td>
                <td className="py-1.5 pr-3">{source.business} / {source.category}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums font-bold">{source.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
