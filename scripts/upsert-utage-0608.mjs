// 2026-06-08 朝 UTAGE 最新化
// 6/7 夜以降の新規: PjocL +1メタ広告+1面談予約 (島田留果), TZq4 +1メタ広告合流(留果) +1 StandFM(HIЯO)
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

// 新規マスター: TZq4 StandFM
async function ensureStandFMMaster() {
  const sceId = "TZq4_STANDFM";
  const res = await notion.dataSources.query({
    data_source_id: SOURCE_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: "TZq4ob5n4GZ1" } },
      { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
    ]},
    page_size: 1,
  });
  if (res.results[0]) return res.results[0].id;
  const created = await notion.pages.create({
    parent: { data_source_id: SOURCE_DS },
    properties: {
      "名前": { title: [{ text: { content: "地方医学部オンライン塾 ローカルメディ / SNS: StandFM" } }] },
      "UTAGEアカウントID": { rich_text: [{ text: { content: "TZq4ob5n4GZ1" } }] },
      "UTAGEアカウント名": { rich_text: [{ text: { content: "地方医学部オンライン塾 ローカルメディ" } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: sceId } }] },
      "UTAGEシナリオ名": { rich_text: [{ text: { content: "SNS: StandFM" } }] },
      "経路カテゴリ": { select: { name: "SNS自然流入" } },
      "事業-年度": { relation: [{ id: R8_LOCALMEDI }] },
      "集計対象": { checkbox: true },
      "備考": { rich_text: [{ text: { content: "通年シナリオ message_tracking_name=StandFMから の仮想分割" } }] },
    },
  });
  console.log("+ 新規マスター: TZq4_STANDFM (SNS自然流入)");
  return created.id;
}

const ENTRIES = [
  { acc: "PjocL14v2u6j", sce: "yyog9fvedOtP", label: "再受験/メタ広告", date: "2026-06-07", count: 2 },
  { acc: "PjocL14v2u6j", sce: "V98BSMwhViZC", label: "再受験/面談予約", date: "2026-06-07", count: 1 },
  { acc: "TZq4ob5n4GZ1", sce: "TZq4_META_REUSE", label: "地方医学部/メタ広告(合流)再受験", date: "2026-06-07", count: 2 },
];

async function findMaster(acc, sce) {
  const res = await notion.dataSources.query({
    data_source_id: SOURCE_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: acc } },
      { property: "UTAGEシナリオID", rich_text: { equals: sce } },
    ]},
    page_size: 1,
  });
  return res.results[0]?.id;
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

async function upsert(acc, sce, masterId, date, count, label) {
  const props = {
    "名前": { title: [{ text: { content: `${date} ${label}` } }] },
    "日付": { date: { start: date } },
    "流入経路": { relation: [{ id: masterId }] },
    "新規読者数": { number: count },
    "UTAGEアカウントID": { rich_text: [{ text: { content: acc } }] },
    "UTAGEシナリオID": { rich_text: [{ text: { content: sce } }] },
  };
  const id = await findDaily(acc, sce, date);
  if (id) { await notion.pages.update({ page_id: id, properties: props }); console.log(`~ ${date} ${label}: ${count}`); }
  else { await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props }); console.log(`+ ${date} ${label}: ${count}`); }
}

// 通常エントリ
for (const e of ENTRIES) {
  const masterId = await findMaster(e.acc, e.sce);
  if (!masterId) { console.log(`! マスター未登録: ${e.label}`); continue; }
  await upsert(e.acc, e.sce, masterId, e.date, e.count, e.label);
}

// StandFM (新規マスター + 6/7 1件)
const standFMId = await ensureStandFMMaster();
await upsert("TZq4ob5n4GZ1", "TZq4_STANDFM", standFMId, "2026-06-07", 1, "地方医学部/SNS StandFM");

console.log("\n完了");
