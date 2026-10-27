import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DAILY_DS = "ff6be008-cddc-42ef-831f-9b327e056635";

async function queryRetry(args, maxRetries = 12) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await notion.dataSources.query(args);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      const wait = 2000 * (i + 1);
      console.error(`retry ${i+1}: ${e.message || e.code} - waiting ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

const rows = [];
let cursor;
do {
  const res = await queryRetry({ data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100 });
  rows.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

console.log(`Notion 日次リード数DB: ${rows.length}件\n`);
const byAcc = new Map();
for (const p of rows) {
  const acc = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
  const sce = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
  const date = p.properties["日付"]?.date?.start ?? "";
  const key = `${acc}|${sce}`;
  if (!byAcc.has(key)) byAcc.set(key, { latest: "", count: 0 });
  const x = byAcc.get(key);
  if (date > x.latest) x.latest = date;
  x.count++;
}
console.log("=== (アカウント|シナリオ) 別 最新日付 ===");
for (const [key, x] of [...byAcc.entries()].sort((a, b) => b[1].latest.localeCompare(a[1].latest))) {
  console.log(`  ${key.padEnd(45)} 最新=${x.latest} (${x.count}件)`);
}
