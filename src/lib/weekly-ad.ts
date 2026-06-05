import { unstable_cache } from "next/cache";
import { notion, DS, idToBusiness } from "./notion";

const WEEKLY_AD_DS = DS.weeklyAd; // f7788828-c0d8-4d5b-8cc0-2394ba947cd6
const CAMPAIGN_DS = "8e8bab1e-37de-4739-a814-b5108901523c"; // キャンペーンマスター
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? "600", 10);

export type CampaignStatus = "実施中" | "計画中" | "終了" | "(未設定)";
export type CampaignMedium = "メタ広告" | "Google広告" | "メインLINE" | "YouTube" | "(未設定)";
export type CampaignCategory = string;

export interface WeeklyAdReport {
  id: string;
  campaignName: string;          // タイトル
  campaignPageIds: string[];     // 紐付けキャンペーン (relation)
  periodStart: string | null;    // YYYY-MM-DD
  periodEnd: string | null;      // YYYY-MM-DD
  spend: number;                 // 消化金額
  clicks: number;                // クリック数
  ctr: number | null;            // クリック率 (0-1)
  lineRegistrations: number;     // LINE登録者数
  conversions: number;           // 成約数
  memo: string;                  // メモ
  url: string;
}

export interface CampaignMaster {
  id: string;
  name: string;                  // キャンペーン名
  status: CampaignStatus;
  medium: CampaignMedium;
  category: CampaignCategory;
  year: string;
  businessYearId: string | null;
  business: string;              // 白谷塾オンライン / ローカルメディ / 宮崎教室 / その他
  url: string;
}

function textOf(prop: any): string {
  if (!prop) return "";
  if (prop.type === "title") return prop.title?.map((t: any) => t.plain_text).join("") ?? "";
  if (prop.type === "rich_text") return prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  return "";
}

async function queryAll(dataSourceId: string): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | undefined = undefined;
  try {
    do {
      const res: any = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: cursor,
        page_size: 100,
      });
      results.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  } catch (e: any) {
    if (e?.code === "object_not_found") {
      console.warn(`[weekly-ad] DB ${dataSourceId} に Integration 未接続`);
      return [];
    }
    throw e;
  }
  return results;
}

async function _fetchWeeklyAdReports(): Promise<WeeklyAdReport[]> {
  const pages = await queryAll(WEEKLY_AD_DS);
  return pages.map((p: any): WeeklyAdReport => {
    const props = p.properties;
    const periodStart = props["期間"]?.date?.start ?? null;
    const periodEnd = props["期間"]?.date?.end ?? null;
    return {
      id: p.id,
      campaignName: textOf(props["キャンペーン名"]),
      campaignPageIds: (props["キャンペーン"]?.relation ?? []).map((r: any) => r.id),
      periodStart,
      periodEnd,
      spend: props["消化金額"]?.number ?? 0,
      clicks: props["クリック数"]?.number ?? 0,
      ctr: props["クリック率"]?.number ?? null,
      lineRegistrations: props["LINE登録者数"]?.number ?? 0,
      conversions: props["成約数"]?.number ?? 0,
      memo: textOf(props["メモ"]),
      url: p.url ?? `https://www.notion.so/${p.id.replaceAll("-", "")}`,
    };
  });
}

async function _fetchCampaignMaster(): Promise<CampaignMaster[]> {
  const pages = await queryAll(CAMPAIGN_DS);
  return pages.map((p: any): CampaignMaster => {
    const props = p.properties;
    const bizRel = props["事業-年度"]?.relation?.[0]?.id ?? null;
    const business = bizRel ? idToBusiness(bizRel) : "その他";
    return {
      id: p.id,
      name: textOf(props["キャンペーン名"]),
      status: (props["状態"]?.select?.name as CampaignStatus) ?? "(未設定)",
      medium: (props["媒体"]?.select?.name as CampaignMedium) ?? "(未設定)",
      category: props["カテゴリ"]?.select?.name ?? "",
      year: props["年度"]?.select?.name ?? "",
      businessYearId: bizRel,
      business,
      url: p.url ?? `https://www.notion.so/${p.id.replaceAll("-", "")}`,
    };
  });
}

export const getWeeklyAdReports = unstable_cache(_fetchWeeklyAdReports, ["weekly-ad-reports"], {
  revalidate: CACHE_TTL,
  tags: ["weekly-ad-reports"],
});

export const getCampaignMaster = unstable_cache(_fetchCampaignMaster, ["campaign-master"], {
  revalidate: CACHE_TTL,
  tags: ["campaign-master"],
});

// ─── 集計ヘルパー ─────────────────────────────

export interface CampaignWithReports {
  campaign: CampaignMaster;
  reports: WeeklyAdReport[];     // 期間desc でソート済み
  totals: {
    spend: number;
    clicks: number;
    lineRegistrations: number;
    conversions: number;
    ctr: number | null;          // 加重平均
    cpa: number | null;          // 消化金額 / LINE登録者数
    lineRate: number | null;     // LINE登録者数 / クリック数
    conversionRate: number | null; // 成約数 / LINE登録者数
  };
}

export function groupReportsByCampaign(
  reports: WeeklyAdReport[],
  campaigns: CampaignMaster[],
): CampaignWithReports[] {
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));
  const reportsByCampaign = new Map<string, WeeklyAdReport[]>();
  for (const r of reports) {
    const cId = r.campaignPageIds[0] ?? "__nocampaign__";
    if (!reportsByCampaign.has(cId)) reportsByCampaign.set(cId, []);
    reportsByCampaign.get(cId)!.push(r);
  }

  const rows: CampaignWithReports[] = [];
  for (const [cId, reps] of reportsByCampaign) {
    const camp: CampaignMaster = campaignById.get(cId) ?? {
      id: cId,
      name: reps[0]?.campaignName || "(キャンペーン未設定)",
      status: "(未設定)",
      medium: "(未設定)",
      category: "",
      year: "",
      businessYearId: null,
      business: "その他",
      url: "",
    };
    const sorted = [...reps].sort((a, b) => (b.periodStart ?? "").localeCompare(a.periodStart ?? ""));
    const totals = sumReports(sorted);
    rows.push({ campaign: camp, reports: sorted, totals });
  }
  return rows;
}

export function sumReports(reports: WeeklyAdReport[]): CampaignWithReports["totals"] {
  let spend = 0, clicks = 0, line = 0, conv = 0;
  for (const r of reports) {
    spend += r.spend;
    clicks += r.clicks;
    line += r.lineRegistrations;
    conv += r.conversions;
  }
  return {
    spend,
    clicks,
    lineRegistrations: line,
    conversions: conv,
    ctr: clicks > 0 ? (reports.reduce((s, r) => s + (r.ctr ?? 0) * r.clicks, 0) / clicks) : null,
    cpa: line > 0 ? spend / line : null,
    lineRate: clicks > 0 ? line / clicks : null,
    conversionRate: line > 0 ? conv / line : null,
  };
}

// 先週月曜の YYYY-MM-DD を返す（today JSTベース）
export function lastWeekMondayYmd(today: Date = new Date()): string {
  const d = new Date(today);
  const day = d.getDay(); // Sun=0, Mon=1, ..., Sat=6
  const diffToMon = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMon - 7); // 今週月曜から-7日
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// 稼働中＝今週・先週に週次レポート入力あり / 実施済み＝先々週以前で止まっている
export function partitionByActivity(
  rows: CampaignWithReports[],
  boundaryYmd: string,
): {
  active: CampaignWithReports[];
  ended: CampaignWithReports[];
} {
  const active: CampaignWithReports[] = [];
  const ended: CampaignWithReports[] = [];
  for (const r of rows) {
    const latest = r.reports[0]?.periodStart ?? "";
    if (latest && latest >= boundaryYmd) active.push(r);
    else ended.push(r);
  }
  const byLatest = (a: CampaignWithReports, b: CampaignWithReports) =>
    (b.reports[0]?.periodStart ?? "").localeCompare(a.reports[0]?.periodStart ?? "");
  active.sort(byLatest);
  ended.sort(byLatest);
  return { active, ended };
}
