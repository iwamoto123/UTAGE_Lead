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

// 流入経路マスター取得
const sourceRows = [];
{
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: SOURCE_DS, start_cursor: cursor, page_size: 100 });
    sourceRows.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

const masterIdToCategory = new Map();
for (const p of sourceRows) {
  masterIdToCategory.set(p.id, p.properties["経路カテゴリ"]?.select?.name ?? "?");
}

// 日次リード数
const leadRows = [];
{
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100 });
    leadRows.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

console.log(`流入経路マスター: ${sourceRows.length} 行`);
console.log(`日次リード数: ${leadRows.length} 行`);
console.log();

// カテゴリ別集計
const byCat = {};
const byMonth = {};
for (const p of leadRows) {
  const relId = p.properties["流入経路"]?.relation?.[0]?.id;
  const cat = masterIdToCategory.get(relId) ?? "?";
  const date = p.properties["日付"]?.date?.start ?? "";
  const ym = date.slice(0, 7);
  const count = p.properties["新規読者数"]?.number ?? 0;
  byCat[cat] = (byCat[cat] ?? 0) + count;
  byMonth[ym] = (byMonth[ym] ?? 0) + count;
}
console.log("経路カテゴリ別 合計:");
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log("\n月別 合計:");
for (const [k, v] of Object.entries(byMonth).sort()) console.log(`  ${k}: ${v}`);
