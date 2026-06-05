// 月次PL DB の構造と既存データを確認
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";

const rows = [];
let cursor;
do {
  const res = await notion.dataSources.query({ data_source_id: DS_ID, start_cursor: cursor, page_size: 100, sorts: [{ property: "対象月", direction: "descending" }] });
  rows.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

console.log(`データソース: ${DS_ID}`);
console.log(`全${rows.length}件\n`);

if (rows[0]) {
  console.log("=== プロパティ ===");
  for (const [k, v] of Object.entries(rows[0].properties)) {
    console.log(`  ${k}: ${v.type}`);
  }
  console.log("");
}

// 直近6件表示
console.log("=== 直近6件 ===");
for (const p of rows.slice(0, 6)) {
  const props = p.properties;
  const month = props["対象月"]?.date?.start ?? props["対象月"]?.title?.[0]?.plain_text ?? "(no date)";
  const biz = props["事業-年度"]?.relation?.[0]?.id ?? props["事業"]?.select?.name ?? "";
  const sales = props["売上"]?.number ?? props["売上高"]?.number ?? null;
  const name = props["名前"]?.title?.map(t => t.plain_text).join("") ?? "";
  console.log(`  ${month}  ${biz}  ${name}  売上=${sales}`);
}

// 全プロパティ詳細 (最初の1件)
if (rows[0]) {
  console.log("\n=== 1件目 詳細 ===");
  console.log(JSON.stringify(rows[0].properties, null, 2).slice(0, 3000));
}
