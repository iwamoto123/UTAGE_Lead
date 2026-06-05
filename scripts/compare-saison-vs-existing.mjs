// Saison CSV (2605/2606) を解析し、既存月次PLと比較して 投入が必要か判定
import { Client } from "@notionhq/client";
import iconv from "iconv-lite";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";

const AD_KEYWORDS = ["FACEBK", "FACEBOOK", "INSTAGRAM", "META PLATFORM", "META PAYMENTS", "GOOGLE ADS", "GOOGLE LLC", "X CORP", "TWITTER", "TIKTOK"];

function splitCSV(line) {
  const r = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { r.push(cur); cur = ""; continue; }
    cur += ch;
  }
  r.push(cur);
  return r;
}

function parseSaison(buffer) {
  const decoded = iconv.decode(buffer, "cp932");
  const lines = decoded.split(/\r?\n/);
  let payDate = null, totalAmount = null, headerFound = false;
  const rows = [];
  for (const line of lines) {
    const cols = splitCSV(line);
    if (cols[0] === "お支払日" && cols[1]) { payDate = cols[1].trim(); continue; }
    if (cols[0] === "今回ご請求額" && cols[1]) { totalAmount = parseInt(cols[1].trim(), 10); continue; }
    if (cols[0] === "利用日") { headerFound = true; continue; }
    if (!headerFound) continue;
    const date = (cols[0] || "").trim();
    const shop = (cols[1] || "").trim();
    const amountStr = (cols[5] || "").trim();
    if (!date) continue;
    const m = date.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) continue;
    const yearMonth = `${m[1]}-${m[2]}`;
    const amount = parseInt(amountStr, 10);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const isAd = AD_KEYWORDS.some(k => shop.toUpperCase().includes(k));
    rows.push({ date, yearMonth, shop, amount, isAd });
  }
  const adByMonth = new Map(), totalByMonth = new Map();
  for (const r of rows) {
    if (!r.isAd) continue;
    if (!adByMonth.has(r.yearMonth)) adByMonth.set(r.yearMonth, []);
    adByMonth.get(r.yearMonth).push(r);
    totalByMonth.set(r.yearMonth, (totalByMonth.get(r.yearMonth) ?? 0) + r.amount);
  }
  return { payDate, totalAmount, rows, adByMonth, totalByMonth };
}

const FILES = [
  "/Users/takeshi/Downloads/SAISON_2605 (1).csv",
  "/Users/takeshi/Downloads/SAISON_2606 (1).csv",
];

const monthlyAdFromCsv = new Map();
for (const f of FILES) {
  const buf = fs.readFileSync(f);
  const parsed = parseSaison(buf);
  console.log(`\n--- ${f.split("/").pop()} ---`);
  console.log(`お支払日: ${parsed.payDate}, ご請求額: ¥${parsed.totalAmount?.toLocaleString()}`);
  console.log(`明細件数: ${parsed.rows.length}, 広告系: ${[...parsed.adByMonth.values()].flat().length}件`);
  for (const [ym, total] of parsed.totalByMonth) {
    console.log(`  ${ym}: ¥${total.toLocaleString()}`);
    monthlyAdFromCsv.set(ym, (monthlyAdFromCsv.get(ym) ?? 0) + total);
  }
}

console.log("\n=== 2605+2606 合算 月別広告費 ===");
for (const [ym, total] of [...monthlyAdFromCsv].sort()) {
  console.log(`  ${ym}: ¥${total.toLocaleString()}`);
}

console.log("\n=== 既存 月次PL カード値 と差分 ===");
for (const ym of [...monthlyAdFromCsv.keys()].sort()) {
  const res = await notion.dataSources.query({
    data_source_id: DS_ID,
    filter: { property: "対象月", date: { equals: `${ym}-01` } },
  });
  let sumCard = 0;
  for (const p of res.results) sumCard += p.properties["広告費（カード明細）"]?.number ?? 0;
  const csvTotal = monthlyAdFromCsv.get(ym) ?? 0;
  const diff = csvTotal - sumCard;
  const status = diff === 0 ? "✓ 一致 (再投入不要)"
    : diff > 0 ? `+不足 ¥${diff.toLocaleString()}`
    : `-過剰 ¥${(-diff).toLocaleString()} (既存値が大きい)`;
  console.log(`  ${ym}: CSV=¥${csvTotal.toLocaleString()} vs 既存=¥${sumCard.toLocaleString()}  →  ${status}`);
}
