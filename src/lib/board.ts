import { notion, DS, idToBusiness } from "./notion";

const CAMPAIGN_DS = "8e8bab1e-37de-4739-a814-b5108901523c";

interface WeeklyAdRow {
  startDate: string;
  yearMonth: string;
  amount: number;
  business: string;     // 事業（判定済み）
  campaignName: string;
}

let cachedRows: WeeklyAdRow[] | null = null;
let cachedAt = 0;

// キャンペーン名から事業を推定（フォールバック用）
function inferBusinessFromCampaignName(name: string): "白谷塾オンライン" | "ローカルメディ" | "宮崎教室" | "未分類" {
  if (name.includes("ローカルメディ") || name.includes("再受験") ||
      name.includes("高1・高2") || name.includes("高1高2")) {
    return "ローカルメディ";
  }
  if (name) return "白谷塾オンライン";
  return "未分類";
}

// キャンペーンID → 事業名 のマップを取得
async function fetchCampaignBusinessMap(): Promise<Map<string, string>> {
  const results: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: any = await notion.dataSources.query({
      data_source_id: CAMPAIGN_DS,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  const map = new Map<string, string>();
  for (const page of results) {
    const props = page.properties;
    const bizYearRelation = props["事業-年度"]?.relation ?? [];
    if (bizYearRelation.length === 0) continue;
    const bizYearId = bizYearRelation[0].id;
    const business = idToBusiness(bizYearId);
    if (business === "その他") continue;
    map.set(page.id, business);
  }
  return map;
}

async function fetchWeeklyAdRows(): Promise<WeeklyAdRow[]> {
  const campaignBusinessMap = await fetchCampaignBusinessMap();

  const results: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: any = await notion.dataSources.query({
      data_source_id: DS.weeklyAd,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  const rows: WeeklyAdRow[] = [];
  for (const p of results) {
    const props = p.properties;
    const startDate = props["期間"]?.date?.start ?? null;
    const amount = props["消化金額"]?.number ?? 0;
    const campaignName = props["キャンペーン名"]?.title?.map((t: any) => t.plain_text).join("") ?? "";
    const campaignRelation = props["キャンペーン"]?.relation ?? [];
    if (!startDate || amount <= 0) continue;

    // キャンペーンrelationから事業を引く。なければキャンペーン名で推測（fallback）
    let business: string = "未分類";
    if (campaignRelation.length > 0) {
      const campaignId = campaignRelation[0].id;
      const mapped = campaignBusinessMap.get(campaignId);
      if (mapped) {
        business = mapped;
      }
    }
    if (business === "未分類") {
      business = inferBusinessFromCampaignName(campaignName);
    }

    rows.push({
      startDate,
      yearMonth: startDate.slice(0, 7),
      amount,
      business,
      campaignName,
    });
  }
  return rows;
}

export async function getBoardBreakdown(): Promise<Map<string, Map<string, number>>> {
  if (cachedRows && Date.now() - cachedAt < 5 * 60 * 1000) {
    // ok
  } else {
    cachedRows = await fetchWeeklyAdRows();
    cachedAt = Date.now();
  }
  const map = new Map<string, Map<string, number>>();
  for (const r of cachedRows) {
    if (!map.has(r.yearMonth)) map.set(r.yearMonth, new Map());
    const m = map.get(r.yearMonth)!;
    m.set(r.business, (m.get(r.business) ?? 0) + r.amount);
  }
  return map;
}

export function clearBoardCache() {
  cachedRows = null;
  cachedAt = 0;
}

// 未分類のキャンペーンを検出
export async function getUnclassifiedCampaigns(): Promise<{ campaignName: string; amount: number; weekCount: number }[]> {
  if (!cachedRows || Date.now() - cachedAt >= 5 * 60 * 1000) {
    cachedRows = await fetchWeeklyAdRows();
    cachedAt = Date.now();
  }
  const unclassified = new Map<string, { amount: number; weekCount: number }>();
  for (const r of cachedRows) {
    if (r.business === "未分類") {
      const cur = unclassified.get(r.campaignName) ?? { amount: 0, weekCount: 0 };
      cur.amount += r.amount;
      cur.weekCount += 1;
      unclassified.set(r.campaignName, cur);
    }
  }
  return Array.from(unclassified.entries()).map(([campaignName, info]) => ({
    campaignName,
    amount: info.amount,
    weekCount: info.weekCount,
  }));
}

export interface BusinessShare {
  miyazaki: number;
  online: number;
  localmedi: number;
}

export async function allocateByBoard(yearMonth: string, totalAmount: number): Promise<BusinessShare> {
  const breakdown = await getBoardBreakdown();
  const monthMap = breakdown.get(yearMonth);

  if (!monthMap || monthMap.size === 0) {
    return { miyazaki: 0, online: totalAmount, localmedi: 0 };
  }

  const onlineBoard = monthMap.get("白谷塾オンライン") ?? 0;
  const localmediBoard = monthMap.get("ローカルメディ") ?? 0;
  const miyazakiBoard = monthMap.get("宮崎教室") ?? 0;
  const totalBoard = onlineBoard + localmediBoard + miyazakiBoard;

  if (totalBoard === 0) {
    return { miyazaki: 0, online: totalAmount, localmedi: 0 };
  }

  const miyazaki = Math.round((miyazakiBoard / totalBoard) * totalAmount);
  const localmedi = Math.round((localmediBoard / totalBoard) * totalAmount);
  const online = totalAmount - miyazaki - localmedi;
  return { miyazaki, online, localmedi };
}
