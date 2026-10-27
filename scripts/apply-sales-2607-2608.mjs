// 「令和8年度 月別総売り上げ 7月分/8月分.pdf」→ 月次PL 売上・生徒数 を反映
// 7月: PDF内の各セクション【合計】をそのまま採用（検算済み）
// 8月: PDFに合計行がないため、明細を全件転記して合算
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const R8 = { 宮崎教室: "33588258-2d8c-8172-a026-f20baacea13a", 白谷塾オンライン: "33588258-2d8c-8160-ac00-d9a18a0238ed", ローカルメディ: "33588258-2d8c-81ce-8737-dbf973eca362" };
const TITLE = { 宮崎教室: "白谷塾宮崎教室", 白谷塾オンライン: "白谷塾オンライン", ローカルメディ: "ローカルメディ" };
const DRY = process.argv.includes("--dry");

// n:金額 / null:8月PDFで金額欄が空欄 / 0:休塾・請求なし
// 空欄は「引き落としができなかっただけで後から請求済み」なので、7月分PDFの同一生徒の金額で補完する。
// 該当8名: 高2 甲斐凜々・岩本佑都・脇本翔太(各19,800) / 高3 清武大暉・山﨑由陽・岡富悠(各24,000)
//          オンライン 川口朔(69,800) / ローカル 猪股千紘(59,800)
const n = (x, c = 1) => Array(c).fill(x);

const AUG = {
  高1: [...n(19800, 15), 0, 0, ...n(19800, 6), 29800],                       // 岩崎桃実/桜実=休塾, 花房羅針=29,800
  高2: [19800, null, ...n(19800, 2), null, ...n(19800, 9), 39800, null, ...n(19800, 2), 28000, 29800, 19000],
  高3: [...n(24000, 10), null, ...n(24000, 23), 0, ...n(24000, 4), null, ...n(24000, 3), null, ...n(24000, 6), 28000, 26000],
  オンライン: [59800, 69800, 69800, 59800, 69800, 39800, 59800, null, 69800, 69800, 35000, 59800, 69800, 69800, 24000, 69800, 69800, 69800, 65000, 99800],
  英検: [69800, 69800, 69800, 35000, 39800, 24000, 49000, 12000, 69800, 47000],
  ローカル: [0, 10000, 59800, 59800, null, 29800, 29800, 0, 69800, 59800, 69800, 59800, 89800],
};
const FILL = { 高1: 19800, 高2: 19800, 高3: 24000, オンライン: 69800, 英検: 0, ローカル: 59800 };
const sum = (a, k) => a.reduce((x, y) => x + (y ?? FILL[k]), 0);
const rows = (a) => a.length;
const blanks = (a) => a.filter((x) => x === null).length;
const kyujuku = { 高1: 2, ローカル: 2 }; // 休塾（生徒数から除外）

// 検算: PDFに印字されている行数
const EXPECT_ROWS = { 高1: 24, 高2: 21, 高3: 52, オンライン: 20, 英検: 10, ローカル: 13 };
for (const [k, v] of Object.entries(EXPECT_ROWS)) {
  if (rows(AUG[k]) !== v) { console.error(`行数不一致 ${k}: ${rows(AUG[k])} != ${v}`); process.exit(1); }
}

const PLAN = [
  { ym: "2026-07", biz: "宮崎教室",       sales: 455400 + 376400 + 1185000, students: 23 + 18 + 50, hs: { 高1人数: 23, 高2人数: 18, 高3人数: 50 }, note: "高1 ¥455,400 + 高2 ¥376,400 + 高3 ¥1,185,000（PDF合計）" },
  { ym: "2026-07", biz: "白谷塾オンライン", sales: 1067400, students: 18, note: "オンライン教室 ¥1,067,400（PDF合計）" },
  { ym: "2026-07", biz: "ローカルメディ",   sales: 737800,  students: 13, note: "ローカルメディ ¥737,800（PDF合計）" },
  { ym: "2026-08", biz: "宮崎教室",       sales: sum(AUG.高1, "高1") + sum(AUG.高2, "高2") + sum(AUG.高3, "高3"), students: rows(AUG.高1) - kyujuku.高1 + rows(AUG.高2) + rows(AUG.高3),
    hs: { 高1人数: rows(AUG.高1) - kyujuku.高1, 高2人数: rows(AUG.高2), 高3人数: rows(AUG.高3) },
    note: `高1 ¥${sum(AUG.高1, "高1").toLocaleString()} + 高2 ¥${sum(AUG.高2, "高2").toLocaleString()} + 高3 ¥${sum(AUG.高3, "高3").toLocaleString()}（明細合算）` },
  { ym: "2026-08", biz: "白谷塾オンライン", sales: sum(AUG.オンライン, "オンライン") + sum(AUG.英検, "英検"), students: rows(AUG.オンライン) + rows(AUG.英検),
    note: `オンライン教室 ¥${sum(AUG.オンライン, "オンライン").toLocaleString()} + 英検コース ¥${sum(AUG.英検, "英検").toLocaleString()}（明細合算）` },
  { ym: "2026-08", biz: "ローカルメディ",   sales: sum(AUG.ローカル, "ローカル"), students: rows(AUG.ローカル) - kyujuku.ローカル, note: `ローカルメディ ¥${sum(AUG.ローカル, "ローカル").toLocaleString()}（明細合算）` },
];

const TAG = "令和8年度 月別総売り上げPDF取込(7月分・8月分) 空欄補完版";
console.log(`=== 売上PDF → 月次PL ${DRY ? "【DRY RUN】" : ""} ===`);
console.log(`8月の金額欄が空欄の生徒（引き落とし不可・後日請求済み）: 高2 ${blanks(AUG.高2)}名(各¥${FILL.高2.toLocaleString()}) / 高3 ${blanks(AUG.高3)}名(各¥${FILL.高3.toLocaleString()}) / オンライン ${blanks(AUG.オンライン)}名(¥${FILL.オンライン.toLocaleString()}) / ローカル ${blanks(AUG.ローカル)}名(¥${FILL.ローカル.toLocaleString()}) → 7月分の同額で補完\n`);

for (const p of PLAN) {
  const r = await notion.dataSources.query({ data_source_id: DS_PL, filter: { and: [{ property: "対象月", date: { equals: `${p.ym}-01` } }, { property: "事業-年度", relation: { contains: R8[p.biz] } }] }, page_size: 1 });
  let page = r.results[0];
  let created = false;
  if (!page) {
    if (DRY) { console.log(`【${p.ym}】${p.biz}: レコード新規作成が必要`); }
    else {
      const [y, m] = p.ym.split("-");
      page = await notion.pages.create({ parent: { data_source_id: DS_PL }, properties: {
        "月": { title: [{ text: { content: `${y}年${parseInt(m, 10)}月 ${TITLE[p.biz]}` } }] },
        "対象月": { date: { start: `${p.ym}-01` } },
        "事業-年度": { relation: [{ id: R8[p.biz] }] },
      }});
      created = true;
    }
  }
  const prev = page?.properties?.["売上"]?.number ?? 0;
  console.log(`【${p.ym}】${p.biz.padEnd(9)} 売上 ¥${prev.toLocaleString()} → ¥${p.sales.toLocaleString()}  生徒数 ${p.students}名${created ? "  (ページ新規作成)" : ""}`);
  console.log(`    ${p.note}`);
  if (DRY) continue;
  const hist = page.properties["アップロード履歴"]?.rich_text?.map((t) => t.plain_text).join("") ?? "";
  if (hist.includes(TAG)) { console.log(`    ⏭ 反映済み`); continue; }
  const ts = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const props = { "売上": { number: p.sales }, "生徒数": { number: p.students },
    "アップロード履歴": { rich_text: [{ text: { content: [hist, `${ts} ${TAG}: ${p.biz} 売上 ¥${prev.toLocaleString()}→¥${p.sales.toLocaleString()} / 生徒数 ${p.students}名`].filter(Boolean).join("\n") } }] } };
  for (const [k, v] of Object.entries(p.hs ?? {})) props[k] = { number: v };
  await notion.pages.update({ page_id: page.id, properties: props });
}
console.log(`\n${DRY ? "DRY RUN 完了" : "完了"}`);
