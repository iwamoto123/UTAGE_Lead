// R8 面談・体験生徒DB の 流入企画 紐付け状況を確認
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const CONSULTATION_DS = "e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb";
const CAMPAIGN_DS = "8e8bab1e-37de-4739-a814-b5108901523c";

// 全件取得
const rows = [];
let cursor;
do {
  const res = await notion.dataSources.query({ data_source_id: CONSULTATION_DS, start_cursor: cursor, page_size: 100 });
  rows.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

console.log(`総数: ${rows.length}件\n`);

// キャンペーンマスター 取得
const campaigns = [];
cursor = undefined;
do {
  const res = await notion.dataSources.query({ data_source_id: CAMPAIGN_DS, start_cursor: cursor, page_size: 100 });
  campaigns.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);
const campaignById = new Map(campaigns.map(c => [c.id, {
  name: c.properties["キャンペーン名"]?.title?.map(t => t.plain_text).join("") ?? "",
  medium: c.properties["媒体"]?.select?.name ?? "",
  status: c.properties["状態"]?.select?.name ?? "",
}]));

console.log(`=== キャンペーンマスター ${campaigns.length}件 ===`);
for (const [id, c] of campaignById) {
  console.log(`  ${id.slice(0, 8)}  [${c.medium}] [${c.status}] ${c.name}`);
}

console.log("\n=== R8 面談・体験生徒 一覧 ===");

// 1人目のプロパティ確認
if (rows[0]) {
  console.log("プロパティキー:", Object.keys(rows[0].properties).join(", "));
}

const linked = [];
const unlinked = [];
for (const p of rows) {
  const name = p.properties["名前"]?.title?.map(t => t.plain_text).join("") ?? "";
  const date = p.properties["最終面談日"]?.date?.start ?? "";
  const status = p.properties["ステータス"]?.select?.name ?? "";
  const bizRel = p.properties["事業-年度"]?.relation ?? [];
  const summary = p.properties["面談の要約"]?.rich_text?.map(t => t.plain_text).join("") ?? "";
  const campaignRel = p.properties["流入企画"]?.relation ?? [];
  const row = { id: p.id, name, date, status, summary: summary.slice(0, 120), campaignRel };
  if (campaignRel.length > 0) linked.push(row);
  else unlinked.push(row);
}

console.log(`\n--- 流入企画 紐付け済み ${linked.length}件 ---`);
for (const r of linked) {
  const camps = r.campaignRel.map(cr => campaignById.get(cr.id)?.name ?? `(不明:${cr.id.slice(0,8)})`);
  console.log(`  ✓ ${r.date}  ${r.name.padEnd(15)}  [${r.status}]  → ${camps.join(",")}`);
}

console.log(`\n--- 流入企画 未設定 ${unlinked.length}件 ---`);
unlinked.sort((a,b) => (b.date||"").localeCompare(a.date||""));
for (const r of unlinked) {
  console.log(`  ? ${r.date}  ${r.name.padEnd(15)}  [${r.status}]`);
  if (r.summary) console.log(`      要約: ${r.summary}`);
}

// 出力ファイル
fs.writeFileSync("scripts/consultation-mapping.json", JSON.stringify({ linked, unlinked, campaigns: [...campaignById.entries()].map(([id, v]) => ({ id, ...v })) }, null, 2));
console.log("\n出力: scripts/consultation-mapping.json");
