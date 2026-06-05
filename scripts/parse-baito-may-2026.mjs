// 5月R8 バイト代CSVをパースして baito.json に追加
import fs from "fs";
import path from "path";

const CSV_PATH = "/Users/takeshi/Downloads/バイト生 武士道 振込 - 5月R8.csv";
const BAITO_PATH = "src/data/baito.json";
const YM = "2026-05";

const text = fs.readFileSync(CSV_PATH, "utf8").replace(/^﻿/, "");
const lines = text.split("\n");

function parseLine(line) {
  const cells = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\"" && line[i+1] === "\"") { cur += "\""; i++; continue; }
    if (ch === "\"") { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { cells.push(cur); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

// 既存baito.json
const baitoData = JSON.parse(fs.readFileSync(BAITO_PATH, "utf8"));

// 既存講師→事業 マップ (直近の事業)
const nameToBiz = new Map();
for (const r of baitoData.records) {
  nameToBiz.set(r.name, r.business);
}

// 名前正規化 (空白除去)
function norm(s) { return s.replace(/[\s　]/g, ""); }
const normToName = new Map();
for (const n of nameToBiz.keys()) normToName.set(norm(n), n);

// 既存講師名と曖昧一致(部分一致)で見つける
function findExisting(name) {
  const n = norm(name);
  if (normToName.has(n)) return normToName.get(n);
  // 1文字違い等の探索
  for (const [exN, exOrig] of normToName) {
    if (exN.length === n.length) {
      let diff = 0;
      for (let i = 0; i < n.length; i++) if (n[i] !== exN[i]) diff++;
      if (diff === 1) return exOrig;
    }
  }
  return null;
}

// 金額を抽出 (例: "13000円", "13,000円")
function extractAmounts(text) {
  if (!text) return [];
  const matches = text.matchAll(/(\d[\d,]*)\s*円/g);
  return [...matches].map(m => parseInt(m[1].replace(/,/g, ""), 10));
}

// 数値文字列をパース
function parseAmount(s) {
  if (!s) return 0;
  return parseInt(String(s).replace(/[,円\s]/g, ""), 10) || 0;
}

// 担当生徒数を抽出 (例: "担当生徒数 2人")
function extractStudents(text) {
  if (!text) return 0;
  const m = text.match(/担当生徒数?\s*[:：]?\s*(\d+)\s*人/);
  if (m) return parseInt(m[1], 10);
  const m2 = text.match(/担当生徒\s*(\d+)\s*人/);
  if (m2) return parseInt(m2[1], 10);
  return 0;
}

const records = [];
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const c = parseLine(line);
  // CSV列: 0=タイムスタンプ 1=完了 2=名前 3=合計 4=内容 5=口座 6=オンライン内訳 7=現地内訳 8=備考
  const name = (c[2] || "").trim();
  const totalRaw = (c[3] || "").trim();
  const content = (c[4] || "").trim();
  const onlineText = (c[6] || "").trim();
  const genchiText = (c[7] || "").trim();
  const note = (c[8] || "").trim();
  if (!name || !totalRaw) continue;

  const total = parseAmount(totalRaw);
  if (total === 0) continue;

  // online/genchi 推定
  let online = 0, genchi = 0;
  const onlineAmounts = extractAmounts(onlineText);
  const genchiAmounts = extractAmounts(genchiText);
  online = onlineAmounts.reduce((s, v) => s + v, 0);
  genchi = genchiAmounts.reduce((s, v) => s + v, 0);

  // 内容に「現地のみ」等のヒント
  if (content.includes("現地") && !content.includes("オンライン")) {
    genchi = total; online = 0;
  } else if (content.includes("オンライン") && !content.includes("現地")) {
    online = total; genchi = 0;
  } else if (online + genchi === 0) {
    // どちらも未抽出 → 内容で判定
    if (content.includes("撮影")) genchi = total;
    else online = total;
  }

  // 合計と差分があれば残差は担当費としてonlineに
  const diff = total - (online + genchi);
  if (diff > 0 && online > 0) online += diff;
  else if (diff > 0 && genchi > 0 && online === 0) genchi += diff;
  else if (diff > 0) online += diff;

  const students = extractStudents(onlineText);
  const allDone = (c[1] || "").trim().toUpperCase() === "TRUE";

  // 事業判定
  let business = "";
  const existing = findExisting(name);
  if (existing) {
    business = nameToBiz.get(existing);
  } else if (genchi > 0 && online === 0) {
    business = "宮崎教室";
  } else {
    business = "白谷塾オンライン"; // デフォルト
  }

  // 現地のみの場合は宮崎教室として記録 (講師所属事業に関わらず)
  // 既存パターン: 5月R7 中山みさ など現地のみ → 宮崎教室
  // 講師所属事業が宮崎以外でも、現地分は宮崎、オンライン分は所属事業に分ける必要がある
  // 既存baito.jsonでは1講師1事業で記録しているので、それに揃える
  // 現地+オンライン両方ある場合は所属事業に寄せる
  if (genchi > 0 && online === 0) business = "宮崎教室";

  records.push({
    name,
    ym: YM,
    business,
    total,
    online,
    genchi,
    students,
    allDone,
    hasIncomplete: false,
    breakdownText: [onlineText, genchiText, note].filter(Boolean).join("\n").trim() || content,
  });
}

console.log(`=== 5月R8 バイト代 ${records.length}件 ===\n`);
for (const r of records) {
  const match = findExisting(r.name);
  const tag = match && match !== r.name ? ` (既存:${match})` : (match ? "" : " ★新規");
  console.log(`  ${r.name.padEnd(10)} [${r.business.padEnd(10)}] ¥${r.total.toString().padStart(7)} (オン¥${r.online} / 現¥${r.genchi})${tag}`);
}

const sumBiz = {};
for (const r of records) {
  sumBiz[r.business] = (sumBiz[r.business] || 0) + r.total;
}
console.log("\n=== 事業別合計 ===");
for (const [b, s] of Object.entries(sumBiz)) console.log(`  ${b}: ¥${s.toLocaleString()}`);
console.log(`  総計: ¥${records.reduce((s, r) => s + r.total, 0).toLocaleString()}`);

// 既存と異なる5月分があれば削除してから追加
const existing2026_05 = baitoData.records.filter(r => r.ym === YM);
if (existing2026_05.length > 0) {
  console.log(`\n既存${YM} ${existing2026_05.length}件を置換`);
  baitoData.records = baitoData.records.filter(r => r.ym !== YM);
}
baitoData.records.push(...records);

// businessMonth も更新
baitoData.businessMonth = baitoData.businessMonth || [];
baitoData.businessMonth = baitoData.businessMonth.filter(b => b.ym !== YM);
for (const [b, s] of Object.entries(sumBiz)) {
  baitoData.businessMonth.push({ business: b, ym: YM, total: s });
}

fs.writeFileSync(BAITO_PATH, JSON.stringify(baitoData, null, 2));
console.log(`\n✓ baito.json 更新 (${baitoData.records.length}件)`);
