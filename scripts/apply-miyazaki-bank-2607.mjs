// 宮崎教室（カ)シラタニジュクミヤザキ・ミナミノベオカ支店）通帳CSV → 月次PL 2026-07
// nmr20260901093542.csv は7月分のみ（46件）
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const MIYAZAKI = "33588258-2d8c-8172-a026-f20baacea13a";
const DRY = process.argv.includes("--dry");
const YM = "2026-07";
const TAG = "宮崎教室 通帳CSV取込(nmr20260901093542 / 7月分)";

// 7月分の分類（二重計上を避けるため、総給振資金730,138＝6月バイト代 と セゾン1,354,515＝カード明細計上済み は除外）
const SET = {
  地代家賃: 53330,          // DF.アルファー家賃（推定値と一致）
  水道光熱費: 2393 + 2423 + 3526,   // 上下水道 ×2 ＋ ワタナベ石油ガス = 8,342（推定38,295から修正）
};
const ADD = {
  通信費: 4730,             // CATV料金
  支払手数料: 9240 + 2200 + 550 + 550 + 385 + 385 + 330 + 385 + 385,  // 総振手数料＋ビジネスWEB＋振込手数料
  その他経費: 68000 + 39600, // アテナクリエイション＋ノダケンセツ
  業務委託費: 53000 + 24000 + 10000 + 6300 + 3000, // イシザワ/カワノ/シキ/コムレ/ハシモト への個別振込
  その他売上: 21573,        // グーグル（YouTube収益）
};
const yen = (n) => "¥" + n.toLocaleString();

const r = await notion.dataSources.query({ data_source_id: DS, filter: { and: [{ property: "対象月", date: { equals: `${YM}-01` } }, { property: "事業-年度", relation: { contains: MIYAZAKI } }] }, page_size: 1 });
const page = r.results[0];
if (!page) { console.error("レコードなし"); process.exit(1); }
const hist = page.properties["アップロード履歴"]?.rich_text?.map((t) => t.plain_text).join("") ?? "";
if (hist.includes(TAG)) { console.log("⏭ 反映済み"); process.exit(0); }

console.log(`=== 宮崎教室 通帳 → 月次PL ${YM} ${DRY ? "【DRY RUN】" : ""} ===\n`);
const props = {}; const logs = [];
for (const [k, v] of Object.entries(SET)) { const prev = page.properties[k]?.number ?? 0; props[k] = { number: v }; logs.push(`${k} ${yen(prev)}→${yen(v)}`); }
for (const [k, v] of Object.entries(ADD)) { const prev = page.properties[k]?.number ?? 0; props[k] = { number: prev + v }; logs.push(`${k} ${yen(prev)}+${yen(v)}=${yen(prev + v)}`); }
for (const l of logs) console.log(`  ${l}`);
console.log(`\n  ※ 除外: 総給振資金 ¥730,138（6月バイト代・計上済み）／セゾン ¥1,354,515（カード明細から計上済み）`);
console.log(`  ※ 法人間移動: カ)ブシドウ ¥1,500,000 ＋ カ)シラタニジュク ¥500,000 = ¥2,000,000（損益に影響しないため未反映）`);
if (!DRY) {
  const ts = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  props["アップロード履歴"] = { rich_text: [{ text: { content: [hist, `${ts} ${TAG}: ${logs.join(" / ")}`].filter(Boolean).join("\n") } }] };
  await notion.pages.update({ page_id: page.id, properties: props });
}
console.log(`\n${DRY ? "DRY RUN 完了" : "完了"}`);
