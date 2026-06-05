// /leads ページのデータ整合性を検証
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

const totalsJson = JSON.parse(fs.readFileSync("scripts/utage-account-totals.json", "utf8"));

// 流入経路マスター
const sourceRows = [];
{ let c; do { const r = await notion.dataSources.query({ data_source_id: SOURCE_DS, start_cursor: c, page_size: 100 }); sourceRows.push(...r.results); c = r.has_more ? r.next_cursor : undefined; } while (c); }
const masterMap = new Map();
for (const p of sourceRows) {
  const accId = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
  const sceId = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
  const cat = p.properties["経路カテゴリ"]?.select?.name ?? "";
  masterMap.set(`${accId}|${sceId}`, { category: cat });
}

// 日次リード数
const leadRows = [];
{ let c; do { const r = await notion.dataSources.query({ data_source_id: DAILY_DS, start_cursor: c, page_size: 100 }); leadRows.push(...r.results); c = r.has_more ? r.next_cursor : undefined; } while (c); }

// アカウント別に集計
const byAccount = {};
for (const p of leadRows) {
  const accId = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
  const sceId = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
  const count = p.properties["新規読者数"]?.number ?? 0;
  const m = masterMap.get(`${accId}|${sceId}`) ?? masterMap.get(`${accId}|`);
  const cat = m?.category ?? "?";
  if (!byAccount[accId]) byAccount[accId] = { メタ広告: 0, "YouTube自然流入": 0, 公式LINE: 0, 面談予約: 0, total: 0 };
  if (byAccount[accId][cat] !== undefined) byAccount[accId][cat] += count;
  byAccount[accId].total += count;
}

console.log(`流入経路マスター: ${sourceRows.length}行, 日次リード: ${leadRows.length}行\n`);

console.log("[アカウント] | 累計(JSON) | 期間内合計(Notion) | メタ広告 | YouTube | 公式LINE | 面談予約");
console.log("-".repeat(100));
for (const a of totalsJson.accounts) {
  const n = byAccount[a.id] ?? { メタ広告: 0, "YouTube自然流入": 0, 公式LINE: 0, 面談予約: 0, total: 0 };
  const name = a.name.length > 30 ? a.name.slice(0, 28) + ".." : a.name.padEnd(30, "　");
  console.log(`${name.padEnd(30)} | ${String(a.total).padStart(8)} | ${String(n.total).padStart(8)} | ${String(n["メタ広告"]).padStart(5)} | ${String(n["YouTube自然流入"]).padStart(5)} | ${String(n["公式LINE"]).padStart(5)} | ${String(n["面談予約"]).padStart(5)}`);
}
