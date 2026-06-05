// 月次PL 2026-03/04/05 の 広告費(カード明細) と アップロード履歴を確認
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const BIZ_MAP = {
  "33588258-2d8c-8172-a026-f20baacea13a": "宮崎教室",
  "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷塾オンライン",
  "33588258-2d8c-81ce-8737-dbf973eca362": "ローカルメディ",
};

for (const ym of ["2026-03", "2026-04", "2026-05"]) {
  const res = await notion.dataSources.query({
    data_source_id: DS_ID,
    filter: { property: "対象月", date: { equals: `${ym}-01` } },
  });
  console.log(`\n=== ${ym} ===`);
  for (const p of res.results) {
    const bizId = p.properties["事業-年度"]?.relation?.[0]?.id ?? "";
    const biz = BIZ_MAP[bizId] ?? bizId;
    const card = p.properties["広告費（カード明細）"]?.number;
    const manual = p.properties["広告費"]?.number;
    const hist = p.properties["アップロード履歴"]?.rich_text?.map(t => t.plain_text).join("") ?? "";
    console.log(`  [${biz}] カード=¥${(card ?? 0).toLocaleString()} / 手動=¥${(manual ?? 0).toLocaleString()}`);
    if (hist) for (const l of hist.split("\n")) console.log(`    履歴: ${l}`);
  }
}
