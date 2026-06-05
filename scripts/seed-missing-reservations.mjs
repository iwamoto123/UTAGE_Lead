// 面談予約シナリオで流入経路マスターに未登録のものを追加
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";

const R8 = {
  "宮崎教室": "335882582d8c8172a026f20baacea13a",
  "白谷塾オンライン": "335882582d8c8160ac00d9a18a0238ed",
  "ローカルメディ": "335882582d8c81ce8737dbf973eca362",
};

const RESERVATION_SCENARIOS = [
  { acc_id: "cFwIiZpTXRrQ", acc_name: "【浪人生用LINE】白谷塾オンライン教室", sce_id: "PN8ZDb4nbEkJ", sce_name: "【浪人生・再受験生】Zoom無料相談リマインダ", business: "白谷塾オンライン" },
  { acc_id: "cFwIiZpTXRrQ", acc_name: "【浪人生用LINE】白谷塾オンライン教室", sce_id: "XjlCHGOxoTNv", sce_name: "【浪人生・再受験生】Zoom無料相談リマインダ_コピー20260403185117", business: "白谷塾オンライン" },
  { acc_id: "rOYD8sgrLdAP", acc_name: "白谷塾 本気の春期講習【R8 新高3】", sce_id: "UMV5CiMCCXaO", sce_name: "個別Zoom無料相談", business: "白谷塾オンライン" },
  { acc_id: "Cj6XBnqUWjjU", acc_name: "ローカルメディ 高校数学の予習講座【新高1 春講座】", sce_id: "0jjONWWVLFEw", sce_name: "個別Zoom無料相談", business: "ローカルメディ" },
  { acc_id: "xVMnVBF3fzuI", acc_name: "白谷塾オンライン教室【1月進研模試対策】", sce_id: "LAhTrH0UmAN1", sce_name: "Zoom無料相談リマインダ", business: "白谷塾オンライン" },
  { acc_id: "DS7H8oI4ZEI0", acc_name: "【最後の企画】共通テスト短期プログラム", sce_id: "PfL6qXaYnTEB", sce_name: "Zoom無料相談リマインダ", business: "白谷塾オンライン" },
  { acc_id: "Zp6OhqYDlg9i", acc_name: "共テ残り100日｜白谷塾オンライン教室", sce_id: "vrqlLowBOcBb", sce_name: "Zoom無料相談リマインダ", business: "白谷塾オンライン" },
  { acc_id: "2JFOhbEZJBSs", acc_name: "9月模試の集中対策プログラム【白谷塾】", sce_id: "WhLHrzEtrlfh", sce_name: "Zoom無料相談リマインダ", business: "白谷塾オンライン" },
  { acc_id: "Z0kJVSw022ed", acc_name: "夏期講習【白谷塾オンライン教室R7】", sce_id: "AQNG0a3VJq5E", sce_name: "Zoom無料相談リマインダ", business: "白谷塾オンライン" },
  { acc_id: "7qQJ38rzLtbM", acc_name: "熊大超特化塾｜白谷塾オンライン教室", sce_id: "OQu9St8wqN9R", sce_name: "Zoom無料相談リマインダ", business: "白谷塾オンライン" },
];

// 既存チェック
const existing = new Set();
{
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: SOURCE_DS, start_cursor: cursor, page_size: 100 });
    for (const p of res.results) {
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      existing.add(`${a}|${s}`);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

let created = 0, skipped = 0;
for (const r of RESERVATION_SCENARIOS) {
  if (existing.has(`${r.acc_id}|${r.sce_id}`)) { skipped++; continue; }
  await notion.pages.create({
    parent: { data_source_id: SOURCE_DS },
    properties: {
      "名前": { title: [{ text: { content: `${r.acc_name} / ${r.sce_name}` } }] },
      "UTAGEアカウントID": { rich_text: [{ text: { content: r.acc_id } }] },
      "UTAGEアカウント名": { rich_text: [{ text: { content: r.acc_name } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: r.sce_id } }] },
      "UTAGEシナリオ名": { rich_text: [{ text: { content: r.sce_name } }] },
      "経路カテゴリ": { select: { name: "面談予約" } },
      "事業-年度": { relation: [{ id: R8[r.business] }] },
      "集計対象": { checkbox: true },
    },
  });
  created++;
  console.log(`+ ${r.acc_name} / ${r.sce_name}`);
}
console.log(`\n完了: 新規 ${created} / スキップ ${skipped}`);
