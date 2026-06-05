// baito.json の 2026-05 分を 月次PL の 人件費(バイト代) に反映
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const BIZ_ID = {
  "宮崎教室":       "33588258-2d8c-8172-a026-f20baacea13a",
  "白谷塾オンライン":  "33588258-2d8c-8160-ac00-d9a18a0238ed",
  "ローカルメディ":   "33588258-2d8c-81ce-8737-dbf973eca362",
};
const TARGET = "2026-05-01";
const LOG = "2026-06-06 baito.json 5月分 → 人件費(バイト代) 反映";

const baito = JSON.parse(fs.readFileSync("src/data/baito.json", "utf8"));
const may = baito.records.filter(r => r.ym === "2026-05");
const byBiz = {};
for (const r of may) byBiz[r.business] = (byBiz[r.business] ?? 0) + r.total;

console.log("=== baito.json 5月分 ===");
for (const [b, s] of Object.entries(byBiz)) console.log(`  ${b}: ¥${s.toLocaleString()}`);

async function findPage(bizId) {
  const res = await notion.dataSources.query({
    data_source_id: DS_ID,
    filter: { and: [
      { property: "対象月", date: { equals: TARGET } },
      { property: "事業-年度", relation: { contains: bizId } },
    ]},
    page_size: 1,
  });
  return res.results[0];
}

console.log("\n=== 投入 ===");
for (const [biz, amount] of Object.entries(byBiz)) {
  const page = await findPage(BIZ_ID[biz]);
  if (!page) { console.log(`! ${biz}: レコードなし`); continue; }
  const existing = page.properties["人件費（バイト代）"]?.number ?? 0;
  if (existing === amount) {
    console.log(`= ${biz}: 既に ¥${amount.toLocaleString()} 投入済 (スキップ)`);
    continue;
  }
  const prevLog = page.properties["アップロード履歴"]?.rich_text?.map(t => t.plain_text).join("") ?? "";
  await notion.pages.update({
    page_id: page.id,
    properties: {
      "人件費（バイト代）": { number: amount },
      "アップロード履歴": { rich_text: [{ text: { content: prevLog ? `${prevLog}\n${LOG}` : LOG } }] },
    },
  });
  console.log(`+ ${biz}: ¥${existing.toLocaleString()} → ¥${amount.toLocaleString()}`);
}

console.log("\n完了");
