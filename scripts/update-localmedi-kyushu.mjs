// ローカルメディ九州 高1高2 (Tm32etw7epfS) の日次リード数を投入
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

const ACC_ID = "Tm32etw7epfS";
const ACC_NAME = "【メタ広告】医学部塾ローカルメディ九州 高1高2";

const SCENARIOS = [
  {
    sce_id: "MV21NZKu9Rzr",
    sce_name: "医学部塾ローカルメディ九州【お試し】",
    category: "メタ広告",
    daily: {
      "2026-04-04": 2, // 古澤(小城)貴子 / ikko
      "2026-04-05": 1, // hitomi.uehara
      "2026-04-06": 1, // 志岐恵利
      "2026-04-09": 3, // Yuichi Morofuji / masuzaki noriko / タサキ マサコ
      "2026-04-22": 1, // Yasuyo Coulson
      "2026-04-23": 1, // chie
      "2026-05-03": 1, // 大田 育己
      "2026-05-04": 1, // Naoharu Tanizawa
    },
  },
  {
    sce_id: "fpZvVLcMvLMK",
    sce_name: "【無料相談 メタ広告】医学部塾ローカルメディ九州",
    category: "メタ広告",
    daily: {
      "2026-05-19": 3, // しおり / 一憲太郎(はじけん) / 永岡真由美
      "2026-05-21": 2, // tmk / ようこ
      "2026-05-24": 1, // Naoharu Tanizawa
    },
  },
  {
    sce_id: "17Px1lEqob17",
    sce_name: "【お試しキャンペーン】個別Zoom無料相談 ローカルメディ",
    category: "面談予約",
    daily: {
      "2026-04-06": 1, // 志岐恵利
      "2026-04-09": 1, // masuzaki noriko
      "2026-04-11": 1, // 古澤(小城)貴子
      "2026-04-26": 1, // Yasuyo Coulson
    },
  },
  {
    sce_id: "NidcrIoR9Aqi",
    sce_name: "【個別Zoom無料相談】 ローカルメディ 面談予約者シナリオ",
    category: "面談予約",
    daily: {
      "2026-05-19": 1, // 永岡真由美
      "2026-05-26": 1, // 一憲太郎
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
  for (const p of res.results) await notion.pages.update({ page_id: p.id, archived: true });
  return res.results.length;
}

console.log(`=== ${ACC_NAME} (${ACC_ID}) ===\n`);

for (const s of SCENARIOS) {
  const masterId = await ensureMaster(ACC_ID, ACC_NAME, s.sce_id, s.sce_name, s.category);
  const deleted = await deleteScenarioDaily(ACC_ID, s.sce_id);
  console.log(`  [${s.sce_name}] 旧削除: ${deleted}件`);
  let created = 0;
  for (const [date, count] of Object.entries(s.daily)) {
    await notion.pages.create({
      parent: { data_source_id: DAILY_DS },
      properties: {
        "名前": { title: [{ text: { content: `${date} 九州高12/${s.category}` } }] },
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
  console.log(`  [${s.sce_name}] 新規追加: ${created}日 / 合計${total}件`);
}
console.log("\n完了");
