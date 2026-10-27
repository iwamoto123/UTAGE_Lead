// 2026-08 の未確定分を推定で埋める（SAISON 2610 が届くまでの暫定値）
// 8月のカード明細は 8/9 までしか無いため、6月実績（平常月）を推定値として使う。
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const R8 = { 宮崎教室: "33588258-2d8c-8172-a026-f20baacea13a", 白谷塾オンライン: "33588258-2d8c-8160-ac00-d9a18a0238ed", ローカルメディ: "33588258-2d8c-81ce-8737-dbf973eca362" };
const DRY = process.argv.includes("--dry");
const YM = "2026-08";
const TAG = "8月未確定分の推定値セット";

// カード明細(広告費以外)は3事業均等割り。6月実績を使用。
const EST_CARD = { SaaS利用料: Math.round(120236 / 3), 通信費: Math.round(88591 / 3), その他経費: Math.round(79793 / 3) };
// 広告費: ボード集計(週次広告レポート)の実績。カード明細は8/9までの部分値のため、
// 7月のカード/ボード比 1,333,512÷1,283,507 = 1.039 を掛けて推定する。
const BOARD_AUG = { 白谷塾オンライン: 365473, ローカルメディ: 202432, 宮崎教室: 0 };
const RATIO = 1333512 / 1283507;
// 8月バイト代の未提出分（田代汀・伊地知隼）。7月実績を宮崎教室に加算。
const BAITO_EST = { 宮崎教室: 89850 + 32500 };

console.log(`=== 2026-08 推定値の反映 ${DRY ? "【DRY RUN】" : ""} ===`);
console.log(`カード経費(6月実績・3事業均等割): SaaS ¥${EST_CARD.SaaS利用料.toLocaleString()} / 通信費 ¥${EST_CARD.通信費.toLocaleString()} / その他経費 ¥${EST_CARD.その他経費.toLocaleString()}`);
console.log(`広告費(カード明細)推定 = ボード集計 × ${RATIO.toFixed(3)}`);
console.log(`バイト代 未提出分の推定: 宮崎教室 +¥${BAITO_EST.宮崎教室.toLocaleString()}（田代汀¥89,850＋伊地知隼 現地¥32,500＝7月実績）\n`);

for (const bizName of ["白谷塾オンライン", "宮崎教室", "ローカルメディ"]) {
  const r = await notion.dataSources.query({ data_source_id: DS, filter: { and: [{ property: "対象月", date: { equals: `${YM}-01` } }, { property: "事業-年度", relation: { contains: R8[bizName] } }] }, page_size: 1 });
  const page = r.results[0];
  if (!page) { console.log(`! ${bizName}: レコードなし`); continue; }
  const hist = page.properties["アップロード履歴"]?.rich_text?.map((t) => t.plain_text).join("") ?? "";
  if (hist.includes(TAG)) { console.log(`⏭ ${bizName}: 反映済み`); continue; }
  const props = {}; const logs = [];
  const yen = (n) => "¥" + n.toLocaleString();
  for (const [k, v] of Object.entries(EST_CARD)) {
    const prev = page.properties[k]?.number ?? 0;
    props[k] = { number: prev + v }; logs.push(`${k} ${yen(prev)}+${yen(v)}`);
  }
  const board = BOARD_AUG[bizName];
  if (board > 0) {
    const prevAd = page.properties["広告費"]?.number ?? 0;
    const prevCard = page.properties["広告費（カード明細）"]?.number ?? 0;
    props["広告費"] = { number: board };
    props["広告費（カード明細）"] = { number: Math.round(board * RATIO) };
    logs.push(`広告費 ${yen(prevAd)}→${yen(board)}`, `広告費(カード明細) ${yen(prevCard)}→${yen(Math.round(board * RATIO))}(推定)`);
  }
  if (BAITO_EST[bizName]) {
    const prev = page.properties["人件費（バイト代）"]?.number ?? 0;
    props["人件費（バイト代）"] = { number: prev + BAITO_EST[bizName] };
    logs.push(`バイト代 ${yen(prev)}+${yen(BAITO_EST[bizName])}(推定)`);
  }
  console.log(`${DRY ? "would update" : "update"} ${bizName.padEnd(9)}\n     ${logs.join("\n     ")}`);
  if (!DRY) {
    const ts = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    props["アップロード履歴"] = { rich_text: [{ text: { content: [hist, `${ts} ${TAG} ${bizName}: ${logs.join(" / ")}`].filter(Boolean).join("\n") } }] };
    await notion.pages.update({ page_id: page.id, properties: props });
  }
}
console.log(`\n${DRY ? "DRY RUN 完了" : "完了"}`);
