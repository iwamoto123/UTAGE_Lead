// 月次PL DB: 2026-07 の人件費（バイト代）を投入
//   node scripts/update-baito-jul-2026-notion.mjs --dry   # 差分表示のみ
//   node scripts/update-baito-jul-2026-notion.mjs         # 実適用
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const DRY = process.argv.includes("--dry");

const R8 = {
  宮崎教室: "33588258-2d8c-8172-a026-f20baacea13a",
  白谷塾オンライン: "33588258-2d8c-8160-ac00-d9a18a0238ed",
  ローカルメディ: "33588258-2d8c-81ce-8737-dbf973eca362",
};
const TITLE = { 宮崎教室: "白谷塾宮崎教室", 白谷塾オンライン: "白谷塾オンライン", ローカルメディ: "ローカルメディ" };
const MONTH = "2026-07-01";
const LOG = "2026-08-06 7月バイトCSV取込 → 人件費(バイト代) 反映";

const data = JSON.parse(fs.readFileSync("src/data/baito.json", "utf8"));
const target = {};
for (const e of data.businessMonth) if (e.ym === "2026-07") target[e.business] = e.total;

console.log(`=== 2026-07 月次PL 人件費（バイト代） ${DRY ? "(DRY RUN)" : ""} ===\n`);
for (const [biz, amount] of Object.entries(target)) {
  const res = await notion.dataSources.query({
    data_source_id: DS_ID,
    filter: { and: [
      { property: "対象月", date: { equals: MONTH } },
      { property: "事業-年度", relation: { contains: R8[biz] } },
    ]},
    page_size: 1,
  });
  const page = res.results[0];
  const props = { "人件費（バイト代）": { number: amount } };
  if (page) {
    const cur = page.properties["人件費（バイト代）"]?.number ?? 0;
    const prevLog = (page.properties["アップロード履歴"]?.rich_text ?? []).map((t) => t.plain_text).join("");
    props["アップロード履歴"] = { rich_text: [{ text: { content: [prevLog, LOG].filter(Boolean).join("\n") } }] };
    console.log(`~ 更新 ${TITLE[biz].padEnd(12, "　")} ¥${cur.toLocaleString()} → ¥${amount.toLocaleString()}`);
    if (!DRY) await notion.pages.update({ page_id: page.id, properties: props });
  } else {
    props["月"] = { title: [{ text: { content: `2026年7月 ${TITLE[biz]}` } }] };
    props["対象月"] = { date: { start: MONTH } };
    props["事業-年度"] = { relation: [{ id: R8[biz] }] };
    props["アップロード履歴"] = { rich_text: [{ text: { content: LOG } }] };
    console.log(`+ 新規 ${TITLE[biz].padEnd(12, "　")} ¥${amount.toLocaleString()}`);
    if (!DRY) await notion.pages.create({ parent: { type: "data_source_id", data_source_id: DS_ID }, properties: props });
  }
}
console.log(`\n${DRY ? "DRY RUN 完了（書き込みなし）" : "完了"}`);
