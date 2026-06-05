// UTAGE 流入経路マスターに初期投入
//   - 各アカウントを1行
//   - メタ広告アカウントは scenario 単位の行も追加（明確なシナリオのみ）
// 使い方: node scripts/seed-utage-source-master.mjs
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";

// 事業-年度ページ（R8）
const R8 = {
  "宮崎教室": "335882582d8c8172a026f20baacea13a",
  "白谷塾オンライン": "335882582d8c8160ac00d9a18a0238ed",
  "ローカルメディ": "335882582d8c81ce8737dbf973eca362",
};

// アカウント分類（utage-classify.ts と同期）
const ACCOUNT_CATEGORIES = {
  "Tm32etw7epfS": { name: "【メタ広告】医学部塾ローカルメディ九州 高1高2", category: "メタ広告", business: "ローカルメディ" },
  "Cj6XBnqUWjjU": { name: "ローカルメディ 高校数学の予習講座【新高1 春講座】", category: "メタ広告", business: "ローカルメディ" },
  "rOYD8sgrLdAP": { name: "白谷塾 本気の春期講習【R8 新高3】", category: "メタ広告", business: "白谷塾オンライン" },
  "cFwIiZpTXRrQ": { name: "【浪人生用LINE】白谷塾オンライン教室", category: "メタ広告", business: "白谷塾オンライン" },
  "NpJjwohj4a8s": { name: "2月スタートダッシュプログラム【白谷塾】", category: "メタ広告", business: "白谷塾オンライン" },
  "xVMnVBF3fzuI": { name: "白谷塾オンライン教室【1月進研模試対策】", category: "メタ広告", business: "白谷塾オンライン" },
  "DS7H8oI4ZEI0": { name: "【最後の企画】共通テスト短期プログラム", category: "メタ広告", business: "白谷塾オンライン" },
  "Zp6OhqYDlg9i": { name: "共テ残り100日｜白谷塾オンライン教室", category: "メタ広告", business: "白谷塾オンライン" },
  "2JFOhbEZJBSs": { name: "9月模試の集中対策プログラム【白谷塾】", category: "メタ広告", business: "白谷塾オンライン" },
  "Z0kJVSw022ed": { name: "夏期講習【白谷塾オンライン教室R7】", category: "メタ広告", business: "白谷塾オンライン" },
  "7qQJ38rzLtbM": { name: "熊大超特化塾｜白谷塾オンライン教室", category: "メタ広告", business: "白谷塾オンライン", note: "混在: シナリオ単位で分類" },
  "PjocL14v2u6j": { name: "【再受験コース】医学部塾ローカルメディ", category: "メタ広告", business: "ローカルメディ", note: "混在: シナリオ単位で分類" },
  "A3VabSziUdPO": { name: "【6月】白谷塾オンライン教室【R7】", category: "YouTube自然流入", business: "白谷塾オンライン" },
  "TZq4ob5n4GZ1": { name: "地方医学部オンライン塾 ローカルメディ", category: "YouTube自然流入", business: "ローカルメディ" },
  "75qj4QCIIFrE": { name: "白谷塾オンライン教室【R8公式】", category: "公式LINE", business: "白谷塾オンライン" },
  "AejpZj4o5f8v": { name: "白谷塾オンライン教室【R8公式】特典配布", category: "公式LINE", business: "白谷塾オンライン" },
  "tG9qRaflLotn": { name: "白谷塾オンライン教室【R7公式】", category: "公式LINE", business: "白谷塾オンライン" },
  "l4sfwCJFWYP6": { name: "白谷塾チャンネル", category: "公式LINE", business: "白谷塾オンライン" },
  "qN7MMxMWLx3n": { name: "国語 R8", category: "教材販売", business: "白谷塾オンライン" },
  "y7hyqMysZhxd": { name: "物理2025", category: "教材販売", business: "白谷塾オンライン" },
  "7oxtilRUXOBi": { name: "情報2025", category: "教材販売", business: "白谷塾オンライン" },
  "NX0ztS9ct3oN": { name: "白谷塾_宮崎教室_延岡教室_メタ広告", category: "集計外", business: null, note: "シナリオ0件・未使用" },
  "Tagv60l1P33y": { name: "白谷塾オンライン教室【R7公式】② ※予備のアカウントです", category: "集計外", business: null, note: "予備" },
  "nmr2oWmoVm40": { name: "白谷塾チャンネル②", category: "集計外", business: null, note: "予備" },
  "pQQKDWMWZfLd": { name: "白谷塾宮崎教室【冬季講座】", category: "集計外", business: null },
  "E6WNSFdvOwUn": { name: "うちふぉと👶🏻💐ニューボーンフォト", category: "集計外", business: null, note: "別事業" },
  "WXufzbwUHLSo": { name: "【スマホAI学校】えな先生", category: "集計外", business: null, note: "別事業" },
  "e5EqxQLNRlrt": { name: "青雲学舎公式ライン", category: "集計外", business: null, note: "別事業" },
};

// シナリオ単位の明示分類（混在アカウント・カテゴリが明確なシナリオ）
const SCENARIO_OVERRIDES = [
  // 熊大超特化塾
  { acc_id: "7qQJ38rzLtbM", acc_name: "熊大超特化塾｜白谷塾オンライン教室", sce_id: "XAz7XmBFO3yX", sce_name: "メタ広告シナリオ", category: "メタ広告", business: "白谷塾オンライン" },
  // 再受験コース
  { acc_id: "PjocL14v2u6j", acc_name: "【再受験コース】医学部塾ローカルメディ", sce_id: "ss0Y2tqzi9hW", sce_name: "YouTubeシナリオ 【再受験コース】医学部塾ローカルメディ", category: "YouTube自然流入", business: "ローカルメディ" },
  { acc_id: "PjocL14v2u6j", acc_name: "【再受験コース】医学部塾ローカルメディ", sce_id: "yyog9fvedOtP", sce_name: "メタ広告シナリオ 【再受験コース】医学部塾ローカルメディ", category: "メタ広告", business: "ローカルメディ" },
  { acc_id: "PjocL14v2u6j", acc_name: "【再受験コース】医学部塾ローカルメディ", sce_id: "V98BSMwhViZC", sce_name: "【予約完了シナリオ】ローカルメディ 再受験コース 無料オンライン個別相談", category: "面談予約", business: "ローカルメディ" },
  // ローカルメディ九州 メタ広告アカウント内のシナリオ
  { acc_id: "Tm32etw7epfS", acc_name: "【メタ広告】医学部塾ローカルメディ九州 高1高2", sce_id: "fpZvVLcMvLMK", sce_name: "【無料相談 メタ広告】医学部塾ローカルメディ九州", category: "メタ広告", business: "ローカルメディ" },
  { acc_id: "Tm32etw7epfS", acc_name: "【メタ広告】医学部塾ローカルメディ九州 高1高2", sce_id: "17Px1lEqob17", sce_name: "【お試しキャンペーン】個別Zoom無料相談 ローカルメディ", category: "メタ広告", business: "ローカルメディ" },
  { acc_id: "Tm32etw7epfS", acc_name: "【メタ広告】医学部塾ローカルメディ九州 高1高2", sce_id: "MV21NZKu9Rzr", sce_name: "医学部塾ローカルメディ九州【お試し】", category: "メタ広告", business: "ローカルメディ" },
  { acc_id: "Tm32etw7epfS", acc_name: "【メタ広告】医学部塾ローカルメディ九州 高1高2", sce_id: "NidcrIoR9Aqi", sce_name: "【個別Zoom無料相談】 ローカルメディ 面談予約者シナリオ", category: "面談予約", business: "ローカルメディ" },
];

// 既存をクエリして重複チェック
async function getExisting() {
  const results = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: SOURCE_DS, start_cursor: cursor, page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  const seen = new Set();
  for (const p of results) {
    const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
    const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
    seen.add(`${a}|${s}`);
  }
  return seen;
}

const existing = await getExisting();
let created = 0, skipped = 0;

async function upsert(rec) {
  const key = `${rec.acc_id}|${rec.sce_id || ""}`;
  if (existing.has(key)) { skipped++; return; }
  const props = {
    "名前": { title: [{ text: { content: rec.title } }] },
    "UTAGEアカウントID": { rich_text: [{ text: { content: rec.acc_id } }] },
    "UTAGEアカウント名": { rich_text: [{ text: { content: rec.acc_name } }] },
    "経路カテゴリ": { select: { name: rec.category } },
    "集計対象": { checkbox: rec.collect !== false && rec.category !== "集計外" && rec.category !== "教材販売" },
  };
  if (rec.sce_id) props["UTAGEシナリオID"] = { rich_text: [{ text: { content: rec.sce_id } }] };
  if (rec.sce_name) props["UTAGEシナリオ名"] = { rich_text: [{ text: { content: rec.sce_name } }] };
  if (rec.business && R8[rec.business]) props["事業-年度"] = { relation: [{ id: R8[rec.business] }] };
  if (rec.note) props["備考"] = { rich_text: [{ text: { content: rec.note } }] };
  await notion.pages.create({ parent: { data_source_id: SOURCE_DS }, properties: props });
  created++;
  console.log(`+ ${rec.title}`);
}

// 1) アカウントレベルの行
for (const [acc_id, info] of Object.entries(ACCOUNT_CATEGORIES)) {
  await upsert({
    title: info.name,
    acc_id, acc_name: info.name,
    sce_id: "", sce_name: "",
    category: info.category, business: info.business, note: info.note,
  });
}

// 2) シナリオレベルの行（明示分類のみ）
for (const rec of SCENARIO_OVERRIDES) {
  await upsert({
    title: `${rec.acc_name} / ${rec.sce_name}`,
    acc_id: rec.acc_id, acc_name: rec.acc_name,
    sce_id: rec.sce_id, sce_name: rec.sce_name,
    category: rec.category, business: rec.business,
  });
}

console.log(`\n完了: 新規 ${created} / スキップ済み ${skipped}`);
