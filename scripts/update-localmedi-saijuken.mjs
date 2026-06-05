// ローカルメディ 再受験コース (PjocL14v2u6j) の日次リード数を投入
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

const ACC_ID = "PjocL14v2u6j";
const ACC_NAME = "【再受験コース】医学部塾ローカルメディ";

const SCENARIOS = [
  {
    sce_id: "yyog9fvedOtP",
    sce_name: "メタ広告シナリオ 【再受験コース】医学部塾ローカルメディ",
    category: "メタ広告",
    daily: {
      "2026-04-12": 5, "2026-04-13": 3, "2026-04-14": 4, "2026-04-15": 4,
      "2026-04-16": 3, "2026-04-17": 3, "2026-04-18": 4, "2026-04-19": 5,
      "2026-04-20": 8, "2026-04-21": 6, "2026-04-22": 1, "2026-04-23": 2,
      "2026-04-24": 2, "2026-04-25": 4, "2026-04-26": 3, "2026-04-28": 2,
      "2026-04-30": 2, "2026-05-01": 1, "2026-05-02": 4, "2026-05-04": 2,
      "2026-05-05": 3, "2026-05-07": 2, "2026-05-08": 3, "2026-05-09": 1,
      "2026-05-12": 2, "2026-05-13": 3, "2026-05-14": 1, "2026-05-15": 1,
      "2026-05-16": 2, "2026-05-17": 2, "2026-05-18": 1, "2026-05-20": 2,
      "2026-05-21": 1, "2026-05-22": 3, "2026-05-24": 2, "2026-05-26": 3,
    },
  },
  {
    sce_id: "V98BSMwhViZC",
    sce_name: "【予約完了シナリオ】ローカルメディ 再受験コース 無料オンライン個別相談",
    category: "面談予約",
    daily: {
      "2026-04-12": 2, "2026-04-14": 1, "2026-04-16": 1, "2026-04-17": 1,
      "2026-04-18": 1, "2026-04-20": 3, "2026-04-21": 1, "2026-04-22": 2,
      "2026-04-23": 1, "2026-04-24": 1, "2026-05-01": 1, "2026-05-02": 1,
      "2026-05-04": 1, "2026-05-05": 1, "2026-05-07": 1, "2026-05-09": 1,
      "2026-05-12": 1, "2026-05-18": 2, "2026-05-22": 1, "2026-05-24": 1,
    },
  },
  {
    sce_id: "ss0Y2tqzi9hW",
    sce_name: "YouTubeシナリオ 【再受験コース】医学部塾ローカルメディ",
    category: "YouTube自然流入",
    daily: {
      "2026-05-12": 1, "2026-05-17": 1, "2026-05-18": 1, "2026-05-26": 1,
    },
  },
];

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
    console.log(`= master 既存: ${sceName.slice(0, 50)}`);
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
  console.log(`+ master 新規: ${sceName.slice(0, 50)}`);
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
  for (const p of res.results) await notion.pages.update({ page_id: p.id, archived: true });
  return res.results.length;
}

console.log(`=== ${ACC_NAME} (${ACC_ID}) ===\n`);

for (const s of SCENARIOS) {
  const masterId = await ensureMaster(ACC_ID, ACC_NAME, s.sce_id, s.sce_name, s.category);
  const deleted = await deleteScenarioDaily(ACC_ID, s.sce_id);
  console.log(`  [${s.category}] 旧削除: ${deleted}件`);
  let created = 0;
  for (const [date, count] of Object.entries(s.daily)) {
    await notion.pages.create({
      parent: { data_source_id: DAILY_DS },
      properties: {
        "名前": { title: [{ text: { content: `${date} 再受験/${s.category}` } }] },
        "日付": { date: { start: date } },
        "流入経路": { relation: [{ id: masterId }] },
        "新規読者数": { number: count },
        "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
        "UTAGEシナリオID": { rich_text: [{ text: { content: s.sce_id } }] },
      },
    });
    created++;
  }
  const total = Object.values(s.daily).reduce((a, b) => a + b, 0);
  console.log(`  [${s.category}] 新規追加: ${created}日 / 合計${total}件`);
}
console.log("\n完了");
