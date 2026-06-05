// 各アカウントのメタ広告シナリオを流入経路マスターに追加
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
  "白谷塾オンライン": "335882582d8c8160ac00d9a18a0238ed",
  "ローカルメディ": "335882582d8c81ce8737dbf973eca362",
};

const ENTRIES = [
  { acc_id: "xVMnVBF3fzuI", acc_name: "白谷塾オンライン教室【1月進研模試対策】", sce_id: "g3avmzDSjP1R", sce_name: "【メタ広告から】1月進研模試対策プログラム", business: "白谷塾オンライン" },
  { acc_id: "NpJjwohj4a8s", acc_name: "2月スタートダッシュプログラム【白谷塾】", sce_id: "qd4OJj4CeUr3", sce_name: "【メタ広告から】2月スタートダッシュプログラム", business: "白谷塾オンライン" },
  { acc_id: "cFwIiZpTXRrQ", acc_name: "【浪人生用LINE】白谷塾オンライン教室", sce_id: "ulFQpnG5bmZd", sce_name: "【メタ広告から】浪人生用シナリオ", business: "白谷塾オンライン" },
  { acc_id: "rOYD8sgrLdAP", acc_name: "白谷塾 本気の春期講習【R8 新高3】", sce_id: "OwVHe63TSHcj", sce_name: "【メタ広告から】白谷塾 本気の春期講習", business: "白谷塾オンライン" },
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
for (const e of ENTRIES) {
  if (existing.has(`${e.acc_id}|${e.sce_id}`)) { skipped++; console.log(`= ${e.acc_name} / ${e.sce_name}`); continue; }
  await notion.pages.create({
    parent: { data_source_id: SOURCE_DS },
    properties: {
      "名前": { title: [{ text: { content: `${e.acc_name} / ${e.sce_name}` } }] },
      "UTAGEアカウントID": { rich_text: [{ text: { content: e.acc_id } }] },
      "UTAGEアカウント名": { rich_text: [{ text: { content: e.acc_name } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: e.sce_id } }] },
      "UTAGEシナリオ名": { rich_text: [{ text: { content: e.sce_name } }] },
      "経路カテゴリ": { select: { name: "メタ広告" } },
      "事業-年度": { relation: [{ id: R8[e.business] }] },
      "集計対象": { checkbox: true },
    },
  });
  created++;
  console.log(`+ ${e.acc_name} / ${e.sce_name}`);
}
console.log(`\n完了: 新規${created} / スキップ${skipped}`);
