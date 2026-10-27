// 複数のSAISON明細CSVをまとめて 月次PL「広告費（カード明細）」へ反映する。
//
// 背景: カード明細は「締め日」区切りのため、1つの利用月が2枚の明細にまたがる。
//   例) 2026-06 の Meta広告 = SAISON_2607(6/4,6/7) + SAISON_2608(6/11以降)
// updateCardAd 相当の書き込みは上書きなので、利用月ごとの「累計」を出してSETする。
//
// 使い方: node scripts/apply-saison-multi.mjs [--dry] file1.csv file2.csv ...
import { Client } from "@notionhq/client";
import fs from "fs";
import iconv from "iconv-lite";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const DS_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const DS_WA = "f7788828-c0d8-4d5b-8cc0-2394ba947cd6";
const DS_CP = "8e8bab1e-37de-4739-a814-b5108901523c";
const R8 = { 宮崎教室: "33588258-2d8c-8172-a026-f20baacea13a", 白谷塾オンライン: "33588258-2d8c-8160-ac00-d9a18a0238ed", ローカルメディ: "33588258-2d8c-81ce-8737-dbf973eca362" };
const BIZ_BY_ID = Object.fromEntries(Object.entries(R8).map(([k, v]) => [v, k]));

// 広告として計上する店名キーワード
const AD_KEYWORDS = ["FACEBK", "FACEBOOK", "INSTAGRAM", "META PLATFORM", "META PAYMENTS", "GOOGLE ADS", "TIKTOK"];
// 広告に見えるが広告ではないもの（X Premium等のサブスク）
const AD_EXCLUDE = ["X CORP. PAID FEATURES"];

// すでに反映済みの明細から持ち越す利用月別の広告費（今回のCSVに含まれない過去分）
const CARRY_IN = { "2026-05": { amount: 288978, note: "SAISON_2606分（反映済み）" } };

// 利用月が今回のCSV群で完結しているか（＝最後の明細の締め後まで含むか）で判定するための、
// 「明細に含まれる利用日の最大値」。これより後の月は部分値なので書き込まない。
const DRY = process.argv.includes("--dry");
const FILES = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (FILES.length === 0) { console.error("CSVファイルを指定してください"); process.exit(1); }

function splitCSVLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === "," && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur); return out;
}

function parseSaison(path) {
  const decoded = iconv.decode(fs.readFileSync(path), "cp932");
  const rows = []; let header = false, payDate = null, total = null;
  for (const line of decoded.split(/\r?\n/)) {
    const c = splitCSVLine(line);
    if (c[0] === "お支払日" && c[1]) { payDate = c[1].trim(); continue; }
    if (c[0] === "今回ご請求額" && c[1]) { total = parseInt(c[1].trim(), 10); continue; }
    if (c[0] === "利用日") { header = true; continue; }
    if (!header) continue;
    const date = (c[0] ?? "").trim(); const shop = (c[1] ?? "").trim();
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) continue;
    const amount = parseInt((c[5] ?? "").trim(), 10);
    if (!Number.isFinite(amount)) continue;
    rows.push({ date, yearMonth: date.slice(0, 7).replace("/", "-"), shop, amount });
  }
  return { payDate, total, rows };
}

function isAd(shop) {
  const u = shop.toUpperCase();
  if (AD_EXCLUDE.some((k) => u.includes(k))) return false;
  return AD_KEYWORDS.some((k) => u.includes(k));
}

// --- CSV読み込み ---
const adByMonth = new Map();   // ym -> [{date, shop, amount, file}]
let maxUsageDate = "";
for (const f of FILES) {
  const p = parseSaison(f);
  const base = f.split("/").pop();
  console.log(`■ ${base}  お支払日 ${p.payDate} / 請求総額 ¥${(p.total ?? 0).toLocaleString()} / 明細 ${p.rows.length}行`);
  for (const r of p.rows) {
    if (r.date.replaceAll("/", "-") > maxUsageDate) maxUsageDate = r.date.replaceAll("/", "-");
    if (!isAd(r.shop) || r.amount <= 0) continue;
    if (!adByMonth.has(r.yearMonth)) adByMonth.set(r.yearMonth, []);
    adByMonth.get(r.yearMonth).push({ ...r, file: base });
  }
}
const lastCompleteMonth = maxUsageDate.slice(0, 7); // この月は部分値
console.log(`\n明細に含まれる利用日の最大値: ${maxUsageDate} → ${lastCompleteMonth} は部分値のため保留\n`);

// --- 週次広告レポートの月×事業 集計（按分比率） ---
const cpBiz = new Map();
let cur;
do { const r = await notion.dataSources.query({ data_source_id: DS_CP, start_cursor: cur, page_size: 100 });
  for (const p of r.results) { const id = p.properties["事業-年度"]?.relation?.[0]?.id; if (id && BIZ_BY_ID[id]) cpBiz.set(p.id, BIZ_BY_ID[id]); }
  cur = r.has_more ? r.next_cursor : undefined; } while (cur);

const board = {};
cur = undefined;
do { const r = await notion.dataSources.query({ data_source_id: DS_WA, start_cursor: cur, page_size: 100 });
  for (const p of r.results) {
    const start = p.properties["期間"]?.date?.start; const amt = p.properties["消化金額"]?.number ?? 0;
    if (!start || amt <= 0) continue;
    const ym = start.slice(0, 7);
    const name = p.properties["キャンペーン名"]?.title?.map((t) => t.plain_text).join("") ?? "";
    const rel = p.properties["キャンペーン"]?.relation?.[0]?.id;
    let biz = rel ? cpBiz.get(rel) : undefined;
    if (!biz) biz = (name.includes("ローカルメディ") || name.includes("再受験") || name.includes("高1・高2") || name.includes("高1高2")) ? "ローカルメディ" : "白谷塾オンライン";
    board[ym] ??= { 宮崎教室: 0, 白谷塾オンライン: 0, ローカルメディ: 0 };
    board[ym][biz] += amt;
  }
  cur = r.has_more ? r.next_cursor : undefined; } while (cur);

function allocate(total, b) {
  const t = (b?.宮崎教室 ?? 0) + (b?.白谷塾オンライン ?? 0) + (b?.ローカルメディ ?? 0);
  if (!t) return { 宮崎教室: 0, 白谷塾オンライン: total, ローカルメディ: 0 };
  const 宮崎教室 = Math.round((b.宮崎教室 / t) * total);
  const ローカルメディ = Math.round((b.ローカルメディ / t) * total);
  return { 宮崎教室, ローカルメディ, 白谷塾オンライン: total - 宮崎教室 - ローカルメディ };
}

async function findPage(ym, bizId) {
  const res = await notion.dataSources.query({ data_source_id: DS_PL, filter: { and: [{ property: "対象月", date: { equals: `${ym}-01` } }, { property: "事業-年度", relation: { contains: bizId } }] }, page_size: 1 });
  return res.results[0] ?? null;
}
async function createPage(ym, bizName) {
  const [y, m] = ym.split("-");
  const title = `${y}年${parseInt(m, 10)}月 ${bizName === "宮崎教室" ? "白谷塾宮崎教室" : bizName}`;
  return await notion.pages.create({ parent: { data_source_id: DS_PL }, properties: {
    "月": { title: [{ text: { content: title } }] },
    "対象月": { date: { start: `${ym}-01` } },
    "事業-年度": { relation: [{ id: R8[bizName] }] },
  }});
}

const LOG_TAG = `SAISON取込(${FILES.map((f) => f.split("/").pop().replace(/[^0-9]/g, "").slice(0, 4)).join("+")})`;
console.log(`=== 広告費（カード明細）反映 ${DRY ? "【DRY RUN】" : ""} ===\n`);

for (const ym of [...adByMonth.keys()].sort()) {
  const rows = adByMonth.get(ym);
  const csvTotal = rows.reduce((a, r) => a + r.amount, 0);
  const carry = CARRY_IN[ym];
  const cumulative = csvTotal + (carry?.amount ?? 0);
  const partial = ym >= lastCompleteMonth;

  console.log(`【${ym}】 今回CSV分 ¥${csvTotal.toLocaleString()}` + (carry ? ` + 持越 ¥${carry.amount.toLocaleString()} (${carry.note})` : "") + ` = 累計 ¥${cumulative.toLocaleString()}`);
  for (const r of rows) console.log(`    ${r.date} ${r.shop.padEnd(22)} ¥${r.amount.toLocaleString().padStart(9)}  [${r.file}]`);

  const b = board[ym];
  const bt = b ? b.宮崎教室 + b.白谷塾オンライン + b.ローカルメディ : 0;
  const alloc = allocate(cumulative, b);
  console.log(`  ボード集計 ¥${bt.toLocaleString()} (白谷 ¥${(b?.白谷塾オンライン ?? 0).toLocaleString()} / ローカル ¥${(b?.ローカルメディ ?? 0).toLocaleString()}) → 差分 ${cumulative - bt >= 0 ? "+" : ""}¥${(cumulative - bt).toLocaleString()}`);
  console.log(`  按分: 白谷 ¥${alloc.白谷塾オンライン.toLocaleString()} / ローカル ¥${alloc.ローカルメディ.toLocaleString()} / 宮崎 ¥${alloc.宮崎教室.toLocaleString()}`);

  if (partial) { console.log(`  ⏭ ${ym} は明細が ${maxUsageDate} までのため部分値。次の明細を待って反映（今回はスキップ）\n`); continue; }

  for (const bizName of ["白谷塾オンライン", "ローカルメディ", "宮崎教室"]) {
    const amount = alloc[bizName];
    if (amount <= 0) continue;
    let page = await findPage(ym, R8[bizName]);
    let created = false;
    if (!page) { if (DRY) { console.log(`  (新規作成) ${ym} ${bizName}`); } else { page = await createPage(ym, bizName); created = true; } }
    const prev = page?.properties?.["広告費（カード明細）"]?.number ?? 0;
    if (prev === amount) { console.log(`  skip ${bizName.padEnd(9)} ¥${amount.toLocaleString()} (既に同額)`); continue; }
    if (!DRY) {
      const hist = page.properties["アップロード履歴"]?.rich_text?.map((t) => t.plain_text).join("") ?? "";
      const ts = new Date().toISOString().slice(0, 10);
      const newHist = [hist, `${ts} ${LOG_TAG} 広告費(カード明細): ${bizName} ¥${prev.toLocaleString()}→¥${amount.toLocaleString()}`].filter(Boolean).join("\n");
      await notion.pages.update({ page_id: page.id, properties: {
        "広告費（カード明細）": { number: amount },
        "アップロード履歴": { rich_text: [{ text: { content: newHist } }] },
      }});
    }
    console.log(`  ${DRY ? "would set" : "set"} ${bizName.padEnd(9)} ¥${prev.toLocaleString()} → ¥${amount.toLocaleString()}${created ? " (ページ新規作成)" : ""}`);
  }
  console.log("");
}
console.log(DRY ? "DRY RUN 完了（Notionは未変更）" : "完了");
