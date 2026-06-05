// 2026-06 月次PL に Univapay教材売上を反映 (横沢祐太 ¥29,000)
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const R8_ONLINE = "33588258-2d8c-8160-ac00-d9a18a0238ed";
const TARGET_MONTH = "2026-06-01";
const AMOUNT = 29000;
const UPLOAD_LOG = `2026-06-05 Univapay 教材売上 6月分: 横沢祐太 ¥29,000`;

// 既存レコード探す
const res = await notion.dataSources.query({
  data_source_id: DS_ID,
  filter: { and: [
    { property: "対象月", date: { equals: TARGET_MONTH } },
    { property: "事業-年度", relation: { contains: R8_ONLINE } },
  ]},
  page_size: 1,
});

let pageId;
if (res.results.length > 0) {
  pageId = res.results[0].id;
  const existing = res.results[0].properties["教材売上"]?.number ?? 0;
  console.log(`既存レコード ${pageId.slice(0,8)} 教材売上=¥${existing.toLocaleString()}`);
  await notion.pages.update({
    page_id: pageId,
    properties: {
      "教材売上": { number: existing + AMOUNT },
      "アップロード履歴": { rich_text: [{ text: { content: UPLOAD_LOG } }] },
    },
  });
  console.log(`+ 教材売上 +¥${AMOUNT.toLocaleString()} → ¥${(existing + AMOUNT).toLocaleString()}`);
} else {
  const created = await notion.pages.create({
    parent: { data_source_id: DS_ID },
    properties: {
      "月": { title: [{ text: { content: "2026年6月 白谷塾オンライン" } }] },
      "対象月": { date: { start: TARGET_MONTH } },
      "事業-年度": { relation: [{ id: R8_ONLINE }] },
      "教材売上": { number: AMOUNT },
      "アップロード履歴": { rich_text: [{ text: { content: UPLOAD_LOG } }] },
    },
  });
  console.log(`+ 新規ページ作成 ${created.id.slice(0,8)} 教材売上=¥${AMOUNT.toLocaleString()}`);
}
console.log("\n完了");
