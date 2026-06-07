// 総体後無料Zoom相談｜白谷塾オンライン アカウントを 流入経路マスター + 日次リードに登録
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
const R8_ONLINE = "335882582d8c8160ac00d9a18a0238ed";

const ACC_ID = "n99EYdMfgwxy";
const ACC_NAME = "総体後無料Zoom相談｜白谷塾オンライン";

const SCENARIOS = [
  {
    sce_id: "VJHxg3hQn8qy",
    sce_name: "メタ広告シナリオ",
    category: "メタ広告",
    daily: {
      // 2026-06-07: 樋口真弓 (実リード) のみ。社内テスト(堤/みさ/Akito/岩田/白谷/岩本/汀)は除外
      "2026-06-07": 1,
    },
  },
  {
    sce_id: "zZe1kylB5Nfr",
    sce_name: "Zoom無料相談リマインダ",
    category: "面談予約",
    daily: {
      "2026-06-07": 1, // 樋口真弓
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

async function ensureMaster(sceId, sceName, category) {
  let id = await findMaster(ACC_ID, sceId);
  if (id) { console.log(`= 既存 ${sceName}`); return id; }
  const res = await notion.pages.create({
    parent: { data_source_id: SOURCE_DS },
    properties: {
      "名前": { title: [{ text: { content: `${ACC_NAME} / ${sceName}` } }] },
      "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
      "UTAGEアカウント名": { rich_text: [{ text: { content: ACC_NAME } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: sceId } }] },
      "UTAGEシナリオ名": { rich_text: [{ text: { content: sceName } }] },
      "経路カテゴリ": { select: { name: category } },
      "事業-年度": { relation: [{ id: R8_ONLINE }] },
      "集計対象": { checkbox: true },
    },
  });
  console.log(`+ 新規 ${sceName}`);
  return res.id;
}

async function findDaily(acc, sce, date) {
  const res = await notion.dataSources.query({
    data_source_id: DAILY_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: acc } },
      { property: "UTAGEシナリオID", rich_text: { equals: sce } },
      { property: "日付", date: { equals: date } },
    ]},
    page_size: 1,
  });
  return res.results[0]?.id;
}

for (const s of SCENARIOS) {
  const masterId = await ensureMaster(s.sce_id, s.sce_name, s.category);
  for (const [date, count] of Object.entries(s.daily)) {
    const props = {
      "名前": { title: [{ text: { content: `${date} 総体後/${s.category}` } }] },
      "日付": { date: { start: date } },
      "流入経路": { relation: [{ id: masterId }] },
      "新規読者数": { number: count },
      "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: s.sce_id } }] },
    };
    const existId = await findDaily(ACC_ID, s.sce_id, date);
    if (existId) {
      await notion.pages.update({ page_id: existId, properties: props });
      console.log(`  ~ ${date} ${s.category}: ${count}`);
    } else {
      await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
      console.log(`  + ${date} ${s.category}: ${count}`);
    }
  }
}
console.log("\n完了");
