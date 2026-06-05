// 日別合計の検証: 経路カテゴリ別の合計を期間範囲で確認
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

const masterMap = new Map();
{ let c; do { const r = await notion.dataSources.query({ data_source_id: SOURCE_DS, start_cursor: c, page_size: 100 }); for (const p of r.results) { const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? ""; const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? ""; const cat = p.properties["経路カテゴリ"]?.select?.name ?? ""; masterMap.set(`${a}|${s}`, cat); } c = r.has_more ? r.next_cursor : undefined; } while (c); }

const totals = { メタ広告: 0, "YouTube自然流入": 0, 公式LINE: 0, 面談予約: 0, 教材販売: 0, 集計外: 0, "?": 0 };

const leadRows = [];
{ let c; do { const r = await notion.dataSources.query({ data_source_id: DAILY_DS, start_cursor: c, page_size: 100 }); leadRows.push(...r.results); c = r.has_more ? r.next_cursor : undefined; } while (c); }

for (const p of leadRows) {
  const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
  const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
  const count = p.properties["新規読者数"]?.number ?? 0;
  const cat = masterMap.get(`${a}|${s}`) ?? masterMap.get(`${a}|`) ?? "?";
  if (totals[cat] !== undefined) totals[cat] += count;
  else totals["?"] += count;
}

console.log("経路カテゴリ別 全期間合計:");
for (const [k, v] of Object.entries(totals)) console.log(`  ${k}: ${v}`);
console.log(`  TOTAL = ${Object.values(totals).reduce((a, b) => a + b, 0)}`);
