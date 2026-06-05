// Notion 日次リード数DB のアカウント別 最新日付を確認
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DAILY_DS = "ff6be008-cddc-42ef-831f-9b327e056635";

const rows = [];
let cursor;
do {
  const res = await notion.dataSources.query({ data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100 });
  rows.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

console.log(`Notion 日次リード数DB: ${rows.length}件\n`);

const byAcc = new Map();
for (const p of rows) {
  const acc = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
  const sce = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
  const date = p.properties["日付"]?.date?.start ?? "";
  if (!byAcc.has(acc)) byAcc.set(acc, { latest: "", count: 0, scenarios: new Set() });
  const x = byAcc.get(acc);
  if (date > x.latest) x.latest = date;
  x.count++;
  x.scenarios.add(sce);
}

const sorted = [...byAcc.entries()].sort((a, b) => b[1].latest.localeCompare(a[1].latest));
console.log("=== アカウント別 最新日付 (新しい順) ===");
for (const [acc, x] of sorted) {
  console.log(`  ${acc.padEnd(15)} 最新=${x.latest} (${x.count}件 / ${x.scenarios.size}シナリオ)`);
}
