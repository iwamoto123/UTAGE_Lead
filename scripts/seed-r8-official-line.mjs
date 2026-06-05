// 白谷塾オンライン教室【R8公式】の「通年シナリオ→メインシナリオに合流させる」を
// 流入経路マスターに追加 + 日次リード数を投入
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

const ACC_ID = "75qj4QCIIFrE";
const ACC_NAME = "白谷塾オンライン教室【R8公式】";
const SCE_ID = "b9w2rcMtohfk";
const SCE_NAME = "通年シナリオ→メインシナリオに合流させる";

// 日次データ (179件の集計、ページ1+2)
const dailyCounts = {
  "2025-12-17": 1,
  "2026-02-15": 1, "2026-02-17": 1, "2026-02-20": 1, "2026-02-22": 2, "2026-02-23": 2, "2026-02-25": 1, "2026-02-28": 1,
  "2026-03-02": 1, "2026-03-03": 1, "2026-03-04": 3, "2026-03-05": 1, "2026-03-07": 1, "2026-03-10": 1, "2026-03-15": 1,
  "2026-03-16": 1, "2026-03-17": 5, "2026-03-20": 1, "2026-03-22": 1, "2026-03-23": 1, "2026-03-27": 3, "2026-03-29": 1,
  "2026-04-01": 1, "2026-04-02": 1, "2026-04-03": 1, "2026-04-05": 3, "2026-04-06": 1, "2026-04-07": 1, "2026-04-10": 1,
  "2026-04-12": 1, "2026-04-17": 1, "2026-04-20": 1, "2026-04-23": 1, "2026-04-24": 2, "2026-04-25": 1, "2026-04-27": 4,
  "2026-04-29": 1, "2026-04-30": 32,
  "2026-05-01": 12, "2026-05-02": 10, "2026-05-03": 8, "2026-05-04": 4, "2026-05-05": 3, "2026-05-06": 8, "2026-05-07": 2,
  "2026-05-08": 1, "2026-05-09": 2, "2026-05-12": 2, "2026-05-13": 5, "2026-05-14": 1, "2026-05-15": 4, "2026-05-16": 2,
  "2026-05-17": 6, "2026-05-18": 2, "2026-05-19": 3, "2026-05-20": 2, "2026-05-21": 4, "2026-05-22": 5, "2026-05-23": 1,
  "2026-05-24": 2, "2026-05-25": 3, "2026-05-26": 2,
};

// 1) 流入経路マスター: b9w2rcMtohfk を 公式LINE で追加
async function ensureMaster() {
  const res = await notion.dataSources.query({
    data_source_id: SOURCE_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: ACC_ID } },
      { property: "UTAGEシナリオID", rich_text: { equals: SCE_ID } },
    ]},
    page_size: 1,
  });
  if (res.results.length > 0) {
    console.log(`✓ マスターに既存: ${res.results[0].id}`);
    return res.results[0].id;
  }
  const created = await notion.pages.create({
    parent: { data_source_id: SOURCE_DS },
    properties: {
      "名前": { title: [{ text: { content: `${ACC_NAME} / ${SCE_NAME}` } }] },
      "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
      "UTAGEアカウント名": { rich_text: [{ text: { content: ACC_NAME } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: SCE_ID } }] },
      "UTAGEシナリオ名": { rich_text: [{ text: { content: SCE_NAME } }] },
      "経路カテゴリ": { select: { name: "公式LINE" } },
      "事業-年度": { relation: [{ id: R8_ONLINE }] },
      "集計対象": { checkbox: true },
      "備考": { rich_text: [{ text: { content: "R8公式LINEの新規登録の起点シナリオ。YouTube自然流入 + 他LINEからの誘導" } }] },
    },
  });
  console.log(`+ マスター追加: ${created.id}`);
  return created.id;
}

const masterId = await ensureMaster();

// 2) 既存日次レコードを (date) → page_id でロード
const existing = new Map();
{
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100,
      filter: { and: [
        { property: "UTAGEアカウントID", rich_text: { equals: ACC_ID } },
        { property: "UTAGEシナリオID", rich_text: { equals: SCE_ID } },
      ]},
    });
    for (const p of res.results) {
      const d = p.properties["日付"]?.date?.start ?? "";
      existing.set(d, p.id);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

// 3) 日次データを upsert
let created = 0, updated = 0;
for (const [date, count] of Object.entries(dailyCounts)) {
  const props = {
    "名前": { title: [{ text: { content: `${date} R8公式LINE新規` } }] },
    "日付": { date: { start: date } },
    "流入経路": { relation: [{ id: masterId }] },
    "新規読者数": { number: count },
    "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
    "UTAGEシナリオID": { rich_text: [{ text: { content: SCE_ID } }] },
  };
  if (existing.has(date)) {
    await notion.pages.update({ page_id: existing.get(date), properties: props });
    updated++;
  } else {
    await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
    created++;
  }
}
console.log(`\n日次リード数: 新規${created} / 更新${updated}`);
console.log(`合計: ${Object.values(dailyCounts).reduce((a, b) => a + b, 0)}件`);
