// 週次広告レポート（ボード集計）→ 月次PL「広告費」列 を指定月だけ同期する
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674", DS_WA = "f7788828-c0d8-4d5b-8cc0-2394ba947cd6", DS_CP = "8e8bab1e-37de-4739-a814-b5108901523c";
const R8 = { 白谷塾オンライン: "33588258-2d8c-8160-ac00-d9a18a0238ed", 宮崎教室: "33588258-2d8c-8172-a026-f20baacea13a", ローカルメディ: "33588258-2d8c-81ce-8737-dbf973eca362" };
const BY_ID = Object.fromEntries(Object.entries(R8).map(([k, v]) => [v, k]));
const DRY = process.argv.includes("--dry");
const MONTHS = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}$/.test(a));

const cpBiz = new Map(); let cur;
do { const r = await notion.dataSources.query({ data_source_id: DS_CP, start_cursor: cur, page_size: 100 });
  for (const p of r.results) { const id = p.properties["事業-年度"]?.relation?.[0]?.id; if (id && BY_ID[id]) cpBiz.set(p.id, BY_ID[id]); }
  cur = r.has_more ? r.next_cursor : undefined; } while (cur);

const board = {}; cur = undefined;
do { const r = await notion.dataSources.query({ data_source_id: DS_WA, start_cursor: cur, page_size: 100 });
  for (const p of r.results) {
    const s = p.properties["期間"]?.date?.start, amt = p.properties["消化金額"]?.number ?? 0;
    if (!s || amt <= 0 || !MONTHS.includes(s.slice(0, 7))) continue;
    const name = p.properties["キャンペーン名"]?.title?.map((t) => t.plain_text).join("") ?? "";
    const rel = p.properties["キャンペーン"]?.relation?.[0]?.id;
    let biz = rel ? cpBiz.get(rel) : undefined;
    if (!biz) biz = (name.includes("ローカルメディ") || name.includes("再受験") || name.includes("高1・高2") || name.includes("高1高2")) ? "ローカルメディ" : "白谷塾オンライン";
    (board[s.slice(0, 7)] ??= {})[biz] = ((board[s.slice(0, 7)][biz]) ?? 0) + amt;
  }
  cur = r.has_more ? r.next_cursor : undefined; } while (cur);

console.log(`=== ボード集計 → 月次PL「広告費」 ${DRY ? "【DRY RUN】" : ""} ===\n`);
for (const ym of MONTHS) {
  console.log(`【${ym}】`);
  for (const [biz, amt] of Object.entries(board[ym] ?? {})) {
    const r = await notion.dataSources.query({ data_source_id: DS_PL, filter: { and: [{ property: "対象月", date: { equals: `${ym}-01` } }, { property: "事業-年度", relation: { contains: R8[biz] } }] }, page_size: 1 });
    const page = r.results[0]; if (!page) { console.log(`  ! ${biz}: レコードなし`); continue; }
    const prev = page.properties["広告費"]?.number ?? 0;
    const card = page.properties["広告費（カード明細）"]?.number ?? 0;
    if (!DRY) await notion.pages.update({ page_id: page.id, properties: { "広告費": { number: amt } } });
    console.log(`  ${DRY ? "would set" : "set"} ${biz.padEnd(9)} 広告費 ¥${prev.toLocaleString()} → ¥${amt.toLocaleString()}  (カード明細 ¥${card.toLocaleString()} / 差分 ${card - amt >= 0 ? "+" : ""}¥${(card - amt).toLocaleString()})`);
  }
  console.log("");
}
console.log(DRY ? "DRY RUN 完了" : "完了");
