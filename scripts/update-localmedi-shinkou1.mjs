// ローカルメディ 新高1 春講座 (Cj6XBnqUWjjU) の日次リード数を実データで上書き
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";
const DAILY_DS = "ff6be008-cddc-42ef-831f-9b327e056635";
const R8_LOCALMEDI = "335882582d8c81ce8737dbf973eca362";

const ACC_ID = "Cj6XBnqUWjjU";
const ACC_NAME = "ローカルメディ 高校数学の予習講座【新高1 春講座】";

// メタ広告シナリオ
const META = {
  sce_id: "GR5F8Y0Cdwmd",
  sce_name: "【メタ広告から】ローカルメディ 新高1 高校数学の予習講座",
  daily: {
    "2026-03-10": 1, // mihoko yamada
    "2026-03-14": 1, // 宮本よしひで
    "2026-03-15": 1, // 山本悦子
    "2026-03-18": 1, // Ｆ・Chieko
    "2026-03-20": 1, // 小野マキコ
    "2026-03-21": 1, // 丸山裕美
  },
};

// 面談予約シナリオ（0件だがマスターは登録）
const RESERVATION = {
  sce_id: "0jjONWWVLFEw",
  sce_name: "個別Zoom無料相談",
  daily: {},
};

async function findMaster(accId, sceId) {
  const res = await notion.dataSources.query({
    data_source_id: SOURCE_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: accId } },
      { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
    ]},
    page_size: 1,
  });
  return res.results[0]?.id;
}

async function ensureMaster(accId, accName, sceId, sceName, category) {
  let id = await findMaster(accId, sceId);
  if (id) {
    console.log(`= master 既存: ${sceName}`);
    return id;
  }
  const res = await notion.pages.create({
    parent: { data_source_id: SOURCE_DS },
    properties: {
      "名前": { title: [{ text: { content: `${accName} / ${sceName}` } }] },
      "UTAGEアカウントID": { rich_text: [{ text: { content: accId } }] },
      "UTAGEアカウント名": { rich_text: [{ text: { content: accName } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: sceId } }] },
      "UTAGEシナリオ名": { rich_text: [{ text: { content: sceName } }] },
      "経路カテゴリ": { select: { name: category } },
      "事業-年度": { relation: [{ id: R8_LOCALMEDI }] },
      "集計対象": { checkbox: true },
    },
  });
  console.log(`+ master 新規: ${sceName}`);
  return res.id;
}

async function deleteScenarioDaily(accId, sceId) {
  const res = await notion.dataSources.query({
    data_source_id: DAILY_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: accId } },
      { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
    ]},
    page_size: 100,
  });
  for (const p of res.results) {
    await notion.pages.update({ page_id: p.id, archived: true });
  }
  return res.results.length;
}

// 実行
console.log(`=== ${ACC_NAME} (${ACC_ID}) ===\n`);

const metaMasterId = await ensureMaster(ACC_ID, ACC_NAME, META.sce_id, META.sce_name, "メタ広告");
await ensureMaster(ACC_ID, ACC_NAME, RESERVATION.sce_id, RESERVATION.sce_name, "面談予約");

const deleted = await deleteScenarioDaily(ACC_ID, META.sce_id);
console.log(`  旧データ削除: ${deleted}件`);

let created = 0;
for (const [date, count] of Object.entries(META.daily)) {
  await notion.pages.create({
    parent: { data_source_id: DAILY_DS },
    properties: {
      "名前": { title: [{ text: { content: `${date} 新高1春講座/メタ広告` } }] },
      "日付": { date: { start: date } },
      "流入経路": { relation: [{ id: metaMasterId }] },
      "新規読者数": { number: count },
      "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: META.sce_id } }] },
    },
  });
  created++;
}
const total = Object.values(META.daily).reduce((a, b) => a + b, 0);
console.log(`  新規追加: ${created}日 / 合計${total}件`);
console.log("\n完了");
