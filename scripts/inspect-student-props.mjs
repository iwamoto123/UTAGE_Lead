// R8塾生DB の流入企画relationを正確に読む
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const STUDENT_DS = "72ee6524-b6fa-4426-a2f2-1e909d0dd7b0";
const CAMPAIGN_DS = "f9a228cd-8485-45ab-bd6b-ba3975cd1478";

// 全塾生取得
const rows = [];
let cursor;
do {
  const res = await notion.dataSources.query({ data_source_id: STUDENT_DS, start_cursor: cursor, page_size: 100 });
  rows.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

// 1人目のproperty名を出力
if (rows.length > 0) {
  console.log("=== Property names ===");
  console.log(Object.keys(rows[0].properties).join(", "));
}

// 企画DB は Integration未接続なので IDだけ取得 → ページfetch
async function getCampaignName(id) {
  try {
    const p = await notion.pages.retrieve({ page_id: id });
    return p.properties["企画名"]?.title?.map((t) => t.plain_text).join("") ?? id;
  } catch (e) {
    return id;
  }
}

// 各塾生について
console.log("=== 全塾生 流入企画 ===");
for (const p of rows) {
  const name = p.properties["名前"]?.title?.map((t) => t.plain_text).join("") ?? "";
  const month = p.properties["入塾月"]?.date?.start ?? "";
  const status = p.properties["ステータス"]?.select?.name ?? "";
  // 流入関連のプロパティを全部探す
  const propsWithRyu = Object.entries(p.properties).filter(([k, v]) => k.includes("流入") || k.includes("企画") || k.includes("キャンペーン"));
  const ryuParts = [];
  for (const [k, v] of propsWithRyu) {
    if (v.type === "relation") {
      const names = [];
      for (const r of v.relation) names.push(await getCampaignName(r.id));
      ryuParts.push(`${k}=[${names.join(",")}]`);
    } else {
      ryuParts.push(`${k}=${JSON.stringify(v).slice(0,60)}`);
    }
  }
  console.log(`  ${name.padEnd(15)}  ${month}  ${status.padEnd(6)}  ${ryuParts.join(" / ")}`);
}
