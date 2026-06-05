import type { LeadsPageData, UtageDailyLead, UtageRouteCategory } from "@/lib/marketing";
import type { LeadAccountDefinition, LeadAccountSection } from "@/lib/leads-groups";
import { Fragment } from "react";

interface Props {
  sections: LeadAccountSection[];
  data: LeadsPageData;
  comparisonData: LeadsPageData;
  allLeads: UtageDailyLead[];
  dates: string[];
}

const PURE_CATEGORIES = new Set<string>(["メタ広告", "YouTube自然流入", "SNS自然流入", "HP/ブログ", "公式LINE"]);
const DISPLAY_CATEGORIES = new Set<string>(["メタ広告", "YouTube自然流入", "SNS自然流入", "HP/ブログ", "公式LINE", "メタ広告(合流)"]);

const ROUTE_BADGE: Record<string, string> = {
  "メタ広告": "bg-blue-50 text-[#458BC3]",
  "メタ広告(合流)": "bg-blue-50 text-blue-400",
  "YouTube自然流入": "bg-red-50 text-red-700",
  "SNS自然流入": "bg-purple-50 text-purple-700",
  "HP/ブログ": "bg-cyan-50 text-cyan-700",
  "公式LINE": "bg-emerald-50 text-emerald-700",
};

const ROUTE_ORDER: Record<string, number> = {
  "メタ広告": 1,
  "メタ広告(合流)": 2,
  "YouTube自然流入": 3,
  "SNS自然流入": 4,
  "HP/ブログ": 5,
  "公式LINE": 6,
};

const HIDE_ZERO_SECTION_TITLES = new Set([
  "R8 白谷塾オンライン教室 キャンペーン・短期講習",
  "R7 白谷塾オンライン教室 キャンペーン・短期講習",
]);

const HIDE_ZERO_ACCOUNT_IDS = new Set([
  "Cj6XBnqUWjjU", // ローカルメディ 高校数学の予習講座【新高1 春講座】
]);

export default function LeadsRouteBreakdownTable({ sections, data, comparisonData, allLeads, dates }: Props) {
  const scenarioDaily = new Map(data.dailyByScenario);
  const previousScenarioTotals = new Map(comparisonData.scenarios.map((s) => [`${s.accountId}|${s.scenarioId}`, s.periodTotal]));
  const scenarioMeta = buildScenarioMeta(allLeads, data);
  const renderedSections = sections
    .map((section) => ({
      title: section.title,
      accounts: buildAccountRows(section, scenarioMeta, scenarioDaily, previousScenarioTotals, dates),
    }))
    .filter((section) => section.accounts.length > 0);

  return (
    <section className="bg-white border border-slate-200 rounded">
      <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold">アカウント・シナリオ別 流入数</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            指定期間の合計と日別。アカウント行は純リード、シナリオ行は経路別の追加数
          </p>
        </div>
        <div className="text-[10px] text-slate-500">日別列: {dates.length}日分</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-2 font-medium sticky left-0 bg-slate-50 z-[1] min-w-[22rem]">アカウント / シナリオ</th>
              <th className="px-3 py-2 font-medium">実経路</th>
              <th className="px-3 py-2 font-medium text-right">合計</th>
              <th className="px-3 py-2 font-medium text-right">前期間差</th>
              {dates.map((date) => (
                <th key={date} className="px-2 py-2 font-medium text-right min-w-[4.25rem]">
                  {date.slice(5).replace("-", "/")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderedSections.map((section) => (
              <Fragment key={section.title}>
                <tr className="bg-slate-100 border-y border-slate-200">
                  <td colSpan={4 + dates.length} className="px-3 py-2 text-[11px] font-bold text-slate-700">
                    {section.title}
                  </td>
                </tr>
                {section.accounts.map((account) => (
                  <Fragment key={`${account.definition.id}:block`}>
                    <tr className="border-t-4 border-t-slate-200 border-b border-slate-200 bg-slate-50">
                      <td className="px-3 py-2 sticky left-0 bg-slate-50 z-[1] border-l-4 border-l-[#458BC3]">
                        <div className="font-bold text-slate-900">{account.definition.name}</div>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-slate-500">純リード</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-[#458BC3]">{account.total.toLocaleString()}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-bold ${diffColor(account.total - account.previousTotal)}`}>
                        {formatDiff(account.total - account.previousTotal)}
                      </td>
                      {account.daily.map((value, i) => (
                        <DailyCell key={`${account.definition.id}:${dates[i]}`} value={value} strong />
                      ))}
                    </tr>
                    {account.rows.length === 0 ? (
                      <tr className="border-b border-slate-100">
                        <td className="px-3 py-2 sticky left-0 bg-white z-[1] pl-8 text-slate-400">期間内・履歴ともに表示できるシナリオがありません</td>
                        <td colSpan={3 + dates.length} />
                      </tr>
                    ) : account.rows.map((row) => {
                      const previousTotal = previousScenarioTotals.get(row.key) ?? 0;
                      const diff = row.total - previousTotal;
                      return (
                        <tr key={row.key} className={`border-b border-slate-100 hover:bg-slate-50 ${PURE_CATEGORIES.has(row.category) ? "" : "text-slate-500"}`}>
                          <td className="px-3 py-2 sticky left-0 bg-white z-[1] pl-8 max-w-md">
                            <div className="border-l border-slate-200 pl-3 truncate" title={row.scenarioName}>{row.scenarioName || "(シナリオ名なし)"}</div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${ROUTE_BADGE[row.category] ?? "bg-slate-50 text-slate-500"}`}>
                              {routeLabel(row.category)}
                            </span>
                            {!PURE_CATEGORIES.has(row.category) && <span className="ml-1 text-[10px] text-slate-400">除外</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold">{row.total.toLocaleString()}</td>
                          <td className={`px-3 py-2 text-right tabular-nums ${diffColor(diff)}`}>{formatDiff(diff)}</td>
                          {dates.map((date) => (
                            <DailyCell key={`${row.key}:${date}`} value={dailyValue(scenarioDaily.get(row.key), date)} />
                          ))}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface ScenarioMeta {
  key: string;
  accountId: string;
  scenarioId: string;
  scenarioName: string;
  category: UtageRouteCategory | "未分類";
  total: number;
}

interface AccountRenderRow {
  definition: LeadAccountDefinition;
  rows: ScenarioMeta[];
  total: number;
  previousTotal: number;
  daily: number[];
}

function buildAccountRows(
  section: LeadAccountSection,
  scenarioMeta: ScenarioMeta[],
  scenarioDaily: Map<string, { date: string; value: number }[]>,
  previousScenarioTotals: Map<string, number>,
  dates: string[],
): AccountRenderRow[] {
  return section.accounts.flatMap((account) => {
    const metaRows = scenarioMeta
      .filter((s) => s.accountId === account.id && DISPLAY_CATEGORIES.has(s.category))
      .sort((a, b) => (ROUTE_ORDER[a.category] ?? 99) - (ROUTE_ORDER[b.category] ?? 99) || b.total - a.total);
    const total = metaRows.reduce((sum, row) => PURE_CATEGORIES.has(row.category) ? sum + row.total : sum, 0);
    const hideZero = shouldHideWhenZero(section.title, account.id);
    if (hideZero && total === 0) return [];

    const rows = hideZero ? metaRows.filter((row) => row.total > 0) : metaRows;
    const previousTotal = metaRows.reduce((sum, row) => PURE_CATEGORIES.has(row.category) ? sum + (previousScenarioTotals.get(row.key) ?? 0) : sum, 0);
    const daily = dates.map((date) => metaRows.reduce((sum, row) => {
      if (!PURE_CATEGORIES.has(row.category)) return sum;
      return sum + dailyValue(scenarioDaily.get(row.key), date);
    }, 0));

    return [{ definition: account, rows, total, previousTotal, daily }];
  });
}

function shouldHideWhenZero(sectionTitle: string, accountId: string) {
  return HIDE_ZERO_SECTION_TITLES.has(sectionTitle) || HIDE_ZERO_ACCOUNT_IDS.has(accountId);
}

function buildScenarioMeta(allLeads: UtageDailyLead[], data: LeadsPageData): ScenarioMeta[] {
  const map = new Map<string, ScenarioMeta>();
  for (const l of allLeads) {
    if (!l.scenarioId) continue;
    const key = `${l.accountId}|${l.scenarioId}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        accountId: l.accountId,
        scenarioId: l.scenarioId,
        scenarioName: l.scenarioName,
        category: l.category,
        total: 0,
      });
    }
  }
  for (const s of data.scenarios) {
    const key = `${s.accountId}|${s.scenarioId}`;
    const cur = map.get(key) ?? {
      key,
      accountId: s.accountId,
      scenarioId: s.scenarioId,
      scenarioName: s.scenarioName,
      category: s.category as UtageRouteCategory | "未分類",
      total: 0,
    };
    cur.scenarioName = s.scenarioName || cur.scenarioName;
    cur.category = s.category as UtageRouteCategory | "未分類";
    cur.total = s.periodTotal;
    map.set(key, cur);
  }
  return [...map.values()];
}

function dailyValue(points: { date: string; value: number }[] | undefined, date: string) {
  return points?.find((p) => p.date === date)?.value ?? 0;
}

function DailyCell({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <td className={`px-2 py-2 text-right tabular-nums ${strong ? "font-bold text-slate-900" : "text-slate-700"}`}>
      {value > 0 ? value.toLocaleString() : <span className="text-slate-300">-</span>}
    </td>
  );
}

function routeLabel(category: string) {
  if (category === "YouTube自然流入") return "YouTube";
  if (category === "SNS自然流入") return "SNS";
  return category;
}

function formatDiff(value: number) {
  if (value === 0) return "±0";
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}

function diffColor(value: number) {
  if (value > 0) return "text-emerald-700";
  if (value < 0) return "text-red-700";
  return "text-slate-500";
}
