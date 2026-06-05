// 2026-05 月次PL 入力状況を各事業 × 項目で点検
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";

const TARGET = "2026-05-01";
const BIZ_MAP = {
  "33588258-2d8c-8172-a026-f20baacea13a": "宮崎教室",
  "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷塾オンライン",
  "33588258-2d8c-81ce-8737-dbf973eca362": "ローカルメディ",
};

const res = await notion.dataSources.query({
  data_source_id: DS_ID,
  filter: { property: "対象月", date: { equals: TARGET } },
  page_size: 100,
});

// 番号フィールド一覧
const FIELDS = [
  { key: "売上", label: "売上(月謝)" },
  { key: "教材売上", label: "教材売上" },
  { key: "短期講座売上", label: "短期講座売上" },
  { key: "その他売上", label: "その他売上" },
  { key: "教材原価", label: "教材原価" },
  { key: "人件費（バイト代）", label: "人件費(バイト代)" },
  { key: "社員給与", label: "社員給与" },
  { key: "業務委託費", label: "業務委託費" },
  { key: "広告費", label: "広告費(手動)" },
  { key: "広告費（カード明細）", label: "広告費(カード)" },
  { key: "地代家賃", label: "地代家賃" },
  { key: "水道光熱費", label: "水道光熱費" },
  { key: "通信費", label: "通信費" },
  { key: "SaaS利用料", label: "SaaS利用料" },
  { key: "外注費", label: "外注費" },
  { key: "支払手数料", label: "支払手数料" },
  { key: "リース料", label: "リース料" },
  { key: "減価償却費", label: "減価償却費" },
  { key: "その他経費", label: "その他経費" },
  { key: "借入返済", label: "借入返済" },
  { key: "法人間移動", label: "法人間移動" },
];

console.log(`=== 2026-05 月次PL 入力状況 ===\n`);

const byBiz = {};
for (const p of res.results) {
  const bizId = p.properties["事業-年度"]?.relation?.[0]?.id ?? "";
  const biz = BIZ_MAP[bizId] ?? `(不明:${bizId.slice(0,8)})`;
  byBiz[biz] = { id: p.id, props: p.properties, exempt: p.properties["データなし免除"]?.checkbox ?? false };
}

const order = ["宮崎教室", "白谷塾オンライン", "ローカルメディ"];
console.log(`項目`.padEnd(20) + "  " + order.map(b => b.padEnd(14)).join(""));
console.log("-".repeat(80));

for (const f of FIELDS) {
  const row = [f.label.padEnd(18)];
  for (const biz of order) {
    const rec = byBiz[biz];
    const val = rec?.props[f.key]?.number;
    const mark = val !== null && val !== undefined && val > 0
      ? `¥${val.toLocaleString()}`.padEnd(13)
      : (val === 0 || val === null ? "—".padEnd(14) : "(未取得)".padEnd(14));
    row.push(mark);
  }
  console.log(row.join("  "));
}

console.log("\n=== 入力されている項目 vs 未入力項目 ===");
for (const biz of order) {
  const rec = byBiz[biz];
  if (!rec) { console.log(`${biz}: レコードなし`); continue; }
  const entered = [], notEntered = [];
  for (const f of FIELDS) {
    const v = rec.props[f.key]?.number;
    if (v > 0) entered.push(f.label);
    else notEntered.push(f.label);
  }
  console.log(`\n■ ${biz} (免除=${rec.exempt ? "ON" : "OFF"})`);
  console.log(`  入力済(${entered.length}): ${entered.join(", ")}`);
  console.log(`  未入力(${notEntered.length}): ${notEntered.join(", ")}`);
}
