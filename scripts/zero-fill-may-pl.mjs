// 2026-05 月次PL の未入力(null)フィールドを 0 で確定
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

// 確定対象フィールド (number型のみ)
const FIELDS = [
  "売上", "教材売上", "短期講座売上", "その他売上",
  "教材原価",
  "人件費（バイト代）", "社員給与", "業務委託費",
  "広告費", "広告費（カード明細）",
  "地代家賃", "水道光熱費", "通信費", "SaaS利用料",
  "外注費", "支払手数料", "リース料", "減価償却費", "その他経費",
  "借入返済", "法人間移動",
  "生徒数", "高1人数", "高2人数", "高3人数",
];

const res = await notion.dataSources.query({
  data_source_id: DS_ID,
  filter: { property: "対象月", date: { equals: "2026-05-01" } },
});

console.log("=== 2026-05 月次PL null項目を 0 で確定 ===\n");

for (const p of res.results) {
  const bizId = p.properties["事業-年度"]?.relation?.[0]?.id ?? "";
  const biz = BIZ_MAP[bizId] ?? bizId.slice(0,8);

  const toFill = {};
  for (const key of FIELDS) {
    const cur = p.properties[key];
    if (!cur) continue;
    if (cur.type !== "number") continue;
    if (cur.number === null || cur.number === undefined) {
      toFill[key] = { number: 0 };
    }
  }

  if (Object.keys(toFill).length === 0) {
    console.log(`= ${biz}: 全て入力済 (変更なし)`);
    continue;
  }

  await notion.pages.update({ page_id: p.id, properties: toFill });
  console.log(`+ ${biz}: ${Object.keys(toFill).length}項目を 0 で確定`);
  for (const k of Object.keys(toFill)) console.log(`    ${k}`);
}

console.log("\n完了");
