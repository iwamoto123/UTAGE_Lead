import { notion, DS } from "./notion";

type Business = "宮崎教室" | "白谷塾オンライン" | "ローカルメディ";

const BUSINESS_YEAR_URL: Record<string, Record<Business, string>> = {
  R7: {
    "宮崎教室": "https://www.notion.so/340882582d8c81beb53fdce28c493c94",
    "白谷塾オンライン": "https://www.notion.so/335882582d8c819ca109f95672dae188",
    "ローカルメディ": "https://www.notion.so/335882582d8c81228aebcb9285bbe650",
  },
  R8: {
    "宮崎教室": "https://www.notion.so/335882582d8c8172a026f20baacea13a",
    "白谷塾オンライン": "https://www.notion.so/335882582d8c8160ac00d9a18a0238ed",
    "ローカルメディ": "https://www.notion.so/335882582d8c81ce8737dbf973eca362",
  },
};

const TITLE_BUSINESS: Record<Business, string> = {
  "宮崎教室": "白谷塾宮崎教室",
  "白谷塾オンライン": "白谷塾オンライン",
  "ローカルメディ": "ローカルメディ",
};

function yearMonthToFiscalYear(yearMonth: string): "R7" | "R8" {
  const [yStr, mStr] = yearMonth.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (y === 2025 && m >= 4) return "R7";
  if (y === 2026 && m <= 3) return "R7";
  if (y === 2026 && m >= 4) return "R8";
  if (y === 2027 && m <= 3) return "R8";
  return "R8";
}

interface MonthlyPLPage {
  id: string;
  uploadHistory: string;
}

async function findOrCreateMonthlyPL(yearMonth: string, business: Business): Promise<MonthlyPLPage> {
  const monthStart = `${yearMonth}-01`;
  const fy = yearMonthToFiscalYear(yearMonth);
  const businessYearUrl = BUSINESS_YEAR_URL[fy][business];
  const bizYearId = businessYearUrl.split("/").pop()!;

  const res: any = await notion.dataSources.query({
    data_source_id: DS.monthlyPL,
    filter: {
      and: [
        { property: "対象月", date: { equals: monthStart } },
        { property: "事業-年度", relation: { contains: bizYearId } },
      ],
    },
    page_size: 5,
  });

  if (res.results.length > 0) {
    const page = res.results[0];
    const historyProp = page.properties["アップロード履歴"];
    const history = historyProp?.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
    return { id: page.id, uploadHistory: history };
  }

  // 無ければ新規作成
  const [y, m] = yearMonth.split("-");
  const title = `${y}年${parseInt(m, 10)}月 ${TITLE_BUSINESS[business]}`;
  const created: any = await notion.pages.create({
    parent: { data_source_id: DS.monthlyPL },
    properties: {
      "月": { title: [{ text: { content: title } }] },
      "対象月": { date: { start: monthStart } },
      "事業-年度": { relation: [{ id: bizYearId }] },
    },
  });
  return { id: created.id, uploadHistory: "" };
}

export interface CheckExistingResult {
  yearMonth: string;
  business: Business;
  pageId: string;
  alreadyApplied: boolean;
  history: string;
}

/**
 * 該当月×事業のNotionレコードを取得し、ファイル名が過去にアップロード済みかチェック
 */
export async function checkExisting(yearMonth: string, business: Business, fileName: string): Promise<CheckExistingResult> {
  const page = await findOrCreateMonthlyPL(yearMonth, business);
  const alreadyApplied = page.uploadHistory.includes(fileName);
  return {
    yearMonth,
    business,
    pageId: page.id,
    alreadyApplied,
    history: page.uploadHistory,
  };
}

export interface CardAdUpdateResult {
  yearMonth: string;
  business: Business;
  amount: number;
  pageId: string;
  pageUrl: string;
  skipped: boolean;
  reason?: string;
}

/**
 * 「データなし免除」チェックボックスをON/OFFする
 */
export async function markDataless(yearMonth: string, business: Business, exempt: boolean): Promise<{ pageId: string; pageUrl: string }> {
  const page = await findOrCreateMonthlyPL(yearMonth, business);
  await notion.pages.update({
    page_id: page.id,
    properties: {
      "データなし免除": { checkbox: exempt },
    },
  });
  return {
    pageId: page.id,
    pageUrl: `https://www.notion.so/${page.id.replaceAll("-", "")}`,
  };
}

/**
 * 月次PLの任意の数値列を更新する汎用関数
 * 履歴記録はオプション
 */
export async function updateMonthlyPL(
  yearMonth: string,
  business: Business,
  fields: Record<string, number>,
  historyTag?: string,
): Promise<{ pageId: string; pageUrl: string; skipped: boolean; reason?: string }> {
  const page = await findOrCreateMonthlyPL(yearMonth, business);

  if (historyTag && page.uploadHistory.includes(historyTag)) {
    return {
      pageId: page.id,
      pageUrl: `https://www.notion.so/${page.id.replaceAll("-", "")}`,
      skipped: true,
      reason: `${historyTag} は既に登録済み`,
    };
  }

  const properties: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    properties[key] = { number: value };
  }

  if (historyTag) {
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    const newHistory = page.uploadHistory
      ? `${page.uploadHistory}\n[${ts}] ${historyTag}`
      : `[${ts}] ${historyTag}`;
    properties["アップロード履歴"] = { rich_text: [{ text: { content: newHistory } }] };
  }

  await notion.pages.update({
    page_id: page.id,
    properties,
  });

  return {
    pageId: page.id,
    pageUrl: `https://www.notion.so/${page.id.replaceAll("-", "")}`,
    skipped: false,
  };
}

/**
 * 月次PLの「広告費（カード明細）」を更新し、アップロード履歴に追記
 */
export async function updateCardAd(
  yearMonth: string,
  business: Business,
  amount: number,
  fileName: string,
): Promise<CardAdUpdateResult> {
  const page = await findOrCreateMonthlyPL(yearMonth, business);

  if (page.uploadHistory.includes(fileName)) {
    return {
      yearMonth,
      business,
      amount,
      pageId: page.id,
      pageUrl: `https://www.notion.so/${page.id.replaceAll("-", "")}`,
      skipped: true,
      reason: `${fileName} は既に登録済み`,
    };
  }

  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  const newHistory = page.uploadHistory
    ? `${page.uploadHistory}\n[${ts}] ${fileName} (¥${amount.toLocaleString()})`
    : `[${ts}] ${fileName} (¥${amount.toLocaleString()})`;

  await notion.pages.update({
    page_id: page.id,
    properties: {
      "広告費（カード明細）": { number: amount },
      "アップロード履歴": { rich_text: [{ text: { content: newHistory } }] },
    },
  });

  return {
    yearMonth,
    business,
    amount,
    pageId: page.id,
    pageUrl: `https://www.notion.so/${page.id.replaceAll("-", "")}`,
    skipped: false,
  };
}
