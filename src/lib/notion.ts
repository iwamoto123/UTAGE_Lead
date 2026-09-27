import { Client } from "@notionhq/client";

/**
 * Notionクライアント。
 *
 * 読み込んだ時点では作らない。VercelのSecretな環境変数はビルド中には見えず、
 * ここで例外を投げるとビルド時の静的生成にそのエラーが焼き付いて、
 * 実行時にトークンがあっても直らなくなる（/students がこれで落ちていた）。
 * 実際にNotionを呼ぶときに初めて作り、そのときに無ければ落とす。
 */
let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    const auth = process.env.NOTION_TOKEN;
    if (!auth) throw new Error("NOTION_TOKEN が設定されていません（Vercelの環境変数を確認してください）");
    client = new Client({ auth });
  }
  return client;
}

export const notion = new Proxy({} as Client, {
  get(_t, prop, receiver) {
    return Reflect.get(getClient() as object, prop, receiver);
  },
});

export const DS = {
  monthlyPL: process.env.NOTION_DS_MONTHLY_PL ?? "b8ee1633-7341-4fb8-a926-c308d35f1674",
  weeklyAd: process.env.NOTION_DS_WEEKLY_AD ?? "f7788828-c0d8-4d5b-8cc0-2394ba947cd6",
  businessYear: process.env.NOTION_DS_BUSINESS_YEAR ?? "929af9ef-8f3b-4665-b38b-ab2f13043311",
  utageSource: process.env.NOTION_DS_UTAGE_SOURCE ?? "097f9138-25b4-450c-be98-b116973d59df",
  utageDailyLead: process.env.NOTION_DS_UTAGE_DAILY_LEAD ?? "ff6be008-cddc-42ef-831f-9b327e056635",
  // 旧「企画」DB(f9a228cd-…)は2026-08にアーカイブされ404を返すため、キャンペーンマスターに変更
  campaign: process.env.NOTION_DS_CAMPAIGN ?? "8e8bab1e-37de-4739-a814-b5108901523c",
};

// Notion ページURL（dashed UUID で OK）
export function notionPageUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replaceAll("-", "")}`;
}

// 事業-年度ページの dashless UUID
const R7_MIYAZAKI = "340882582d8c81beb53fdce28c493c94";
const R7_ONLINE = "335882582d8c819ca109f95672dae188";
const R7_LOCALMEDI = "335882582d8c81228aebcb9285bbe650";
const R8_MIYAZAKI = "335882582d8c8172a026f20baacea13a";
const R8_ONLINE = "335882582d8c8160ac00d9a18a0238ed";
const R8_LOCALMEDI = "335882582d8c81ce8737dbf973eca362";

const BUSINESS_MAP: Record<string, "宮崎教室" | "白谷塾オンライン" | "ローカルメディ"> = {
  [R7_MIYAZAKI]: "宮崎教室",
  [R8_MIYAZAKI]: "宮崎教室",
  [R7_ONLINE]: "白谷塾オンライン",
  [R8_ONLINE]: "白谷塾オンライン",
  [R7_LOCALMEDI]: "ローカルメディ",
  [R8_LOCALMEDI]: "ローカルメディ",
};

const YEAR_MAP: Record<string, "令和7年度" | "令和8年度"> = {
  [R7_MIYAZAKI]: "令和7年度",
  [R7_ONLINE]: "令和7年度",
  [R7_LOCALMEDI]: "令和7年度",
  [R8_MIYAZAKI]: "令和8年度",
  [R8_ONLINE]: "令和8年度",
  [R8_LOCALMEDI]: "令和8年度",
};

export function idToBusiness(id: string): "宮崎教室" | "白谷塾オンライン" | "ローカルメディ" | "その他" {
  const clean = id.replaceAll("-", "");
  return BUSINESS_MAP[clean] ?? "その他";
}

export function idToYear(id: string): "令和7年度" | "令和8年度" | null {
  const clean = id.replaceAll("-", "");
  return YEAR_MAP[clean] ?? null;
}
