// SAISON_2607.csv の Meta広告費を 月次PL「広告費（カード明細）」へ反映
// - 利用月ごとに全明細を合算 → 事業別に board(週次広告レポート)比率で按分
// - updateCardAd は上書きのため、利用月の「累計」card明細を算出してSET
//   May = 2606分(288,978) + 2607分(612,182) = 901,160 (完了: 5月付けは2607が最後)
//   Jun = 2607分(288,978) のみ (暫定: 6/11以降は2608明細で追加予定)
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const R8 = { 宮崎: "33588258-2d8c-8172-a026-f20baacea13a", 白谷: "33588258-2d8c-8160-ac00-d9a18a0238ed", ローカル: "33588258-2d8c-81ce-8737-dbf973eca362" };
const DRY = process.argv.includes("--dry");

// 利用月ごとの card明細 累計(全事業合算) と board按分比率
const PLAN = [
  { ym: "2026-05", cardTotal: 901160, board: { 白谷: 241311, ローカル: 420438, 宮崎: 0 }, note: "完了(2606+2607)" },
  // 2026-06 は2607に6/4,6/7分(¥288,978)のみ。6/11以降は2608明細で確定するため、
  // 部分値で差分を汚さないよう、次の明細到着まで保留。
];
const LOG = "2026-07-20 SAISON_2607取込 広告費(カード明細)";

function allocate(total, board) {
  const tb = board.白谷 + board.ローカル + board.宮崎;
  if (tb === 0) return { 白谷: total, ローカル: 0, 宮崎: 0 };
  const 宮崎 = Math.round((board.宮崎 / tb) * total);
  const ローカル = Math.round((board.ローカル / tb) * total);
  const 白谷 = total - 宮崎 - ローカル;
  return { 白谷, ローカル, 宮崎 };
}

async function findPage(ym, bizId) {
  const res = await notion.dataSources.query({ data_source_id: DS_ID, filter: { and: [ { property: "対象月", date: { equals: `${ym}-01` } }, { property: "事業-年度", relation: { contains: bizId } } ] }, page_size: 1 });
  return res.results[0];
}

console.log(`=== SAISON_2607 → 広告費(カード明細) ${DRY ? "(DRY RUN)" : ""} ===\n`);
for (const p of PLAN) {
  const alloc = allocate(p.cardTotal, p.board);
  const boardTotal = p.board.白谷 + p.board.ローカル + p.board.宮崎;
  const diff = p.cardTotal - boardTotal;
  console.log(`【${p.ym}】card明細累計 ¥${p.cardTotal.toLocaleString()}  ${p.note}`);
  console.log(`  按分: 白谷 ¥${alloc.白谷.toLocaleString()} / ローカル ¥${alloc.ローカル.toLocaleString()}`);
  console.log(`  board集計 ¥${boardTotal.toLocaleString()} → 広告費差分 ${diff >= 0 ? "+" : ""}¥${diff.toLocaleString()}\n`);
  for (const [name, bizId] of [["白谷", R8.白谷], ["ローカル", R8.ローカル]]) {
    const amount = alloc[name];
    const page = await findPage(p.ym, bizId);
    if (!page) { console.log(`  ! ${p.ym} ${name}: レコードなし`); continue; }
    const prev = page.properties["アップロード履歴"]?.rich_text?.map(t => t.plain_text).join("") ?? "";
    const cur = page.properties["広告費（カード明細）"]?.number ?? 0;
    if (!DRY) await notion.pages.update({ page_id: page.id, properties: {
      "広告費（カード明細）": { number: amount },
      "アップロード履歴": { rich_text: [{ text: { content: [prev, `${LOG}: ${name} ¥${cur.toLocaleString()}→¥${amount.toLocaleString()}`].filter(Boolean).join("\n") } }] },
    }});
    console.log(`  ${DRY ? "would set" : "set"} ${name.padEnd(4)} 広告費(カード明細) ¥${cur.toLocaleString()} → ¥${amount.toLocaleString()}`);
  }
  console.log("");
}
console.log(DRY ? "DRY RUN 完了" : "完了");
