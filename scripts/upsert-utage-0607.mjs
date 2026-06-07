// 2026-06-07 新規分を upsert
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

const ENTRIES = [
  { acc: "PjocL14v2u6j", sce: "yyog9fvedOtP", label: "再受験/メタ広告", date: "2026-06-07", count: 1 },
  { acc: "TZq4ob5n4GZ1", sce: "TZq4_YT_VIDEO", label: "地方医学部/YouTube動画", date: "2026-06-07", count: 1 },
  { acc: "TZq4ob5n4GZ1", sce: "TZq4_META_REUSE", label: "地方医学部/メタ広告(合流)再受験", date: "2026-06-07", count: 1 },
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

for (const e of ENTRIES) {
  const masterId = await findMaster(e.acc, e.sce);
  if (!masterId) { console.log(`! マスター未登録: ${e.label}`); continue; }
  const props = {
    "名前": { title: [{ text: { content: `${e.date} ${e.label}` } }] },
    "日付": { date: { start: e.date } },
    "流入経路": { relation: [{ id: masterId }] },
    "新規読者数": { number: e.count },
    "UTAGEアカウントID": { rich_text: [{ text: { content: e.acc } }] },
    "UTAGEシナリオID": { rich_text: [{ text: { content: e.sce } }] },
  };
  const existingId = await findDaily(e.acc, e.sce, e.date);
  if (existingId) {
    await notion.pages.update({ page_id: existingId, properties: props });
    console.log(`~ ${e.date} ${e.label}: ${e.count}`);
  } else {
    await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
    console.log(`+ ${e.date} ${e.label}: ${e.count}`);
  }
}
console.log("完了");
