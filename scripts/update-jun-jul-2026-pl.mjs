// 月次PL DB: 2026-06 / 2026-07 の売上・6月バイト代を投入
// 売上: 令和8年度 月別総売り上げ(6月/7月)CSV / バイト代: バイト生 武士道 振込 - 6月 R8.csv
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";

const R8_MIYAZAKI  = "33588258-2d8c-8172-a026-f20baacea13a";
const R8_ONLINE    = "33588258-2d8c-8160-ac00-d9a18a0238ed";
const R8_LOCALMEDI = "33588258-2d8c-81ce-8737-dbf973eca362";

const DRY = process.argv.includes("--dry");

// 対象月 → { bizId, title, sales, students, hs1?, hs2?, hs3?, baito? }
const PLAN = [
  // ===== 2026-06 =====
  { month: "2026-06-01", bizId: R8_MIYAZAKI,  title: "2026年6月 白谷塾宮崎教室", sales: 1859400, students: 84, hs1: 21, hs2: 18, hs3: 45, baito: 197600 },
  { month: "2026-06-01", bizId: R8_ONLINE,    title: "2026年6月 白谷塾オンライン", sales:  839600, students: 14, baito: 282300 },
  { month: "2026-06-01", bizId: R8_LOCALMEDI, title: "2026年6月 ローカルメディ",   sales:  634600, students: 12, baito: 250238 },
  // ===== 2026-07 ===== (7月バイト代CSVは未提供のため売上のみ)
  { month: "2026-07-01", bizId: R8_MIYAZAKI,  title: "2026年7月 白谷塾宮崎教室", sales: 1836400, students: 82, hs1: 21, hs2: 18, hs3: 43 },
  { month: "2026-07-01", bizId: R8_ONLINE,    title: "2026年7月 白谷塾オンライン", sales:  902400, students: 14 },
  { month: "2026-07-01", bizId: R8_LOCALMEDI, title: "2026年7月 ローカルメディ",   sales:  678000, students: 12 },
];

const SALES_LOG = "2026-07-20 6月/7月売上CSV取込";
const BAITO_LOG = "2026-07-20 6月バイトCSV取込 → 人件費(バイト代) 反映";

async function findPage(month, bizId) {
  const res = await notion.dataSources.query({
    data_source_id: DS_ID,
    filter: { and: [
      { property: "対象月", date: { equals: month } },
      { property: "事業-年度", relation: { contains: bizId } },
    ]},
    page_size: 1,
  });
  return res.results[0];
}

console.log(`=== 2026-06 / 2026-07 月次PL 投入 ${DRY ? "(DRY RUN)" : ""} ===\n`);

for (const u of PLAN) {
  const existing = await findPage(u.month, u.bizId);

  const props = {
    "売上": { number: u.sales },
    "生徒数": { number: u.students },
    "データなし免除": { checkbox: false },
  };
  if (u.hs1 !== undefined) props["高1人数"] = { number: u.hs1 };
  if (u.hs2 !== undefined) props["高2人数"] = { number: u.hs2 };
  if (u.hs3 !== undefined) props["高3人数"] = { number: u.hs3 };
  if (u.baito !== undefined) props["人件費（バイト代）"] = { number: u.baito };

  const logs = [SALES_LOG, u.baito !== undefined ? BAITO_LOG : null].filter(Boolean);

  if (existing) {
    const prevLog = existing.properties["アップロード履歴"]?.rich_text?.map(t => t.plain_text).join("") ?? "";
    props["アップロード履歴"] = { rich_text: [{ text: { content: [prevLog, ...logs].filter(Boolean).join("\n") } }] };
    const baitoStr = u.baito !== undefined ? ` バイト代¥${u.baito.toLocaleString()}` : "";
    console.log(`~ 更新 ${u.title.padEnd(22)} 売上¥${u.sales.toLocaleString()} 生徒${u.students}名${baitoStr}`);
    if (!DRY) await notion.pages.update({ page_id: existing.id, properties: props });
  } else {
    props["月"] = { title: [{ text: { content: u.title } }] };
    props["対象月"] = { date: { start: u.month } };
    props["事業-年度"] = { relation: [{ id: u.bizId }] };
    props["アップロード履歴"] = { rich_text: [{ text: { content: logs.join("\n") } }] };
    const baitoStr = u.baito !== undefined ? ` バイト代¥${u.baito.toLocaleString()}` : "";
    console.log(`+ 新規 ${u.title.padEnd(22)} 売上¥${u.sales.toLocaleString()} 生徒${u.students}名${baitoStr}`);
    if (!DRY) await notion.pages.create({ parent: { type: "data_source_id", data_source_id: DS_ID }, properties: props });
  }
}

console.log(`\n${DRY ? "DRY RUN 完了（書き込みなし）" : "完了"}`);
