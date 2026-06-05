import { getMonthlyPL, summarize, summarizeRevenue, summarizeRevenueByBusiness, summarizeCost } from "@/lib/db";
import { getPeriodRange, filterByPeriod, filterByBusiness, type PeriodKey } from "@/lib/filter";
import { judgeMonthStatus } from "@/lib/status";
import { getFunnelData, getUtageDailyLeads, summarizeUnified } from "@/lib/marketing";
import KpiCard from "@/components/KpiCard";
import PeriodTabs from "@/components/PeriodTabs";
import CustomPeriodPicker from "@/components/CustomPeriodPicker";
import BusinessTabs from "@/components/BusinessTabs";
import PLTable from "@/components/PLTable";
import MonthlyTrendChart from "@/components/MonthlyTrendChart";
import MiyazakiStudentTrend from "@/components/MiyazakiStudentTrend";
import MiyazakiBaitoBreakdown from "@/components/MiyazakiBaitoBreakdown";
import UnifiedFunnelDashboard from "@/components/UnifiedFunnelDashboard";
import PieBreakdown from "@/components/PieBreakdown";
import RevenueShareBar from "@/components/RevenueShareBar";

type SP = Promise<{ period?: string; business?: string; from?: string; to?: string }>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const period = (sp.period as PeriodKey) ?? "current_year";
  const business = (sp.business ?? "all") as "all" | "宮崎教室" | "白谷塾オンライン" | "ローカルメディ";

  const all = await getMonthlyPL();
  const range = getPeriodRange(period, new Date(), sp.from, sp.to);
  const periodFiltered = filterByPeriod(all, range);
  const filtered = filterByBusiness(periodFiltered, business);

  // 期間内の月リスト & 各月のstatus判定
  const monthSet = new Set<string>();
  filtered.forEach((r) => r.yearMonth && monthSet.add(r.yearMonth));
  const months = Array.from(monthSet).sort();
  const today = new Date();
  const byMonth = new Map<string, typeof filtered>();
  for (const r of filtered) {
    if (!byMonth.has(r.yearMonth)) byMonth.set(r.yearMonth, []);
    byMonth.get(r.yearMonth)!.push(r);
  }
  const submittedMonths = months.filter((m) => {
    const st = judgeMonthStatus(byMonth.get(m) ?? [], m, today);
    return st === "submitted" || st === "exempt";
  });
  const missingCount = months.filter((m) => judgeMonthStatus(byMonth.get(m) ?? [], m, today) === "missing").length;

  // 集計には submitted + exempt（部分データあり可）を含める
  const submittedRecords = filtered.filter((r) => submittedMonths.includes(r.yearMonth));
  const summary = summarize(submittedRecords);

  // マーケティングファネル統合集計（UTAGE + 面談・体験 + 受講生 + 月次PL広告費）
  const funnelData = await getFunnelData();
  const utageLeads = await getUtageDailyLeads();
  const monthlyPLForUnified = all.map((r) => ({
    yearMonth: r.yearMonth,
    business: r.business,
    kokokuhi: r.kokokuhi,
    kokokuhiCard: r.kokokuhiCard,
  }));
  // 今年度（R8）はファネル集計を 2026-01（カレンダー年始）から開始
  const funnelFromYM = period === "current_year" ? `${new Date().getFullYear()}-01` : range.fromYM;
  const unifiedSummary = summarizeUnified(
    utageLeads,
    { consultations: funnelData.consultations, students: funnelData.students },
    monthlyPLForUnified,
    funnelFromYM,
    range.toYM,
    business,
    "all",
  );

  // 内訳円グラフ用
  const revenueBreakdown = business === "all"
    ? summarizeRevenueByBusiness(submittedRecords)
    : summarizeRevenue(submittedRecords);
  const costBreakdown = summarizeCost(submittedRecords);
  const kyozaiGenkaSum = submittedRecords.reduce((s, r) => s + r.kyozaiGenka, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <BusinessTabs active={business} period={period} from={range.fromYM} to={range.toYM} />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <PeriodTabs active={period} business={business} />
            <CustomPeriodPicker
              business={business}
              initialFrom={period === "custom" ? range.fromYM : "2025-04"}
              initialTo={period === "custom" ? range.toYM : "2027-03"}
              minYM="2025-04"
              maxYM="2027-03"
              active={period === "custom"}
            />
          </div>
          <div className="text-sm text-slate-600">{range.label}</div>
        </div>
      </div>

      {missingCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 flex items-center justify-between">
          <span>⚠ この期間に <strong>未提出が {missingCount} ヶ月</strong> あります（PL表のヘッダー「未提出」バッジ参照）</span>
          <a href="/status" className="underline text-red-700 hover:text-red-900">入力状況を確認 →</a>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="売上合計" value={summary.uriageGokei} color="blue" caption="提出済み月のみ集計" />
        <KpiCard label="販管費合計" value={summary.hankanhiGokei} color="orange" caption="提出済み月のみ集計" />
        <KpiCard label="営業利益" value={summary.eigyouRieki} color={summary.eigyouRieki >= 0 ? "green" : "red"} caption="提出済み月のみ集計" />
        <KpiCard label="営業利益率" value={summary.eigyouRiekiRitsu} type="percent" color="purple" caption="提出済み月のみ集計" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieBreakdown title={business === "all" ? "💰 売上の内訳（事業別）" : "💰 売上の内訳（カテゴリ別）"} slices={revenueBreakdown} totalLabel="売上合計" />
        <PieBreakdown title="💸 販管費の内訳" slices={costBreakdown} totalLabel="販管費合計" />
      </div>

      <RevenueShareBar
        revenue={summary.uriageGokei}
        kyozaiGenka={kyozaiGenkaSum}
        costs={costBreakdown}
        profit={summary.eigyouRieki}
      />

      {business === "宮崎教室" ? (
        <div className="space-y-3">
          <MiyazakiStudentTrend rows={filtered} months={months} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="1人あたり月平均売上" value={summary.arpu} type="yen_per_person" color="green" caption="売上÷生徒数 の月平均" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="生徒数（直近月）" value={summary.seitoSuLatest} type="count" color="slate" caption="期間内の最新月" />
          <KpiCard label="1人あたり月平均売上" value={summary.arpu} type="yen_per_person" color="green" caption="売上÷生徒数 の月平均" />
        </div>
      )}

      {business === "宮崎教室" ? (
        <div className="bg-slate-100 border border-slate-300 rounded p-3 text-sm text-slate-600">
          ℹ マーケティングファネルは **白谷塾オンライン・ローカルメディのみ** の集計対象です（宮崎教室は対面販売のため対象外）。「全事業合計」「白谷塾オンライン」「ローカルメディ」タブで確認できます。
        </div>
      ) : (
        <UnifiedFunnelDashboard summary={unifiedSummary} fromYM={funnelFromYM} toYM={range.toYM} seitoSuLatest={summary.seitoSuLatest} />
      )}

      {months.length > 0 && (
        <>
          <MonthlyTrendChart rows={filtered} months={months} />
          <div>
            <h2 className="text-lg font-bold mb-2">損益計算書（月別）</h2>
            <PLTable rows={filtered} months={months} />
          </div>
          {business === "宮崎教室" && (
            <MiyazakiBaitoBreakdown months={months} />
          )}
        </>
      )}

      {months.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          この期間・事業のデータがありません。Notionで該当レコードを作成してください。
        </div>
      )}
    </div>
  );
}
