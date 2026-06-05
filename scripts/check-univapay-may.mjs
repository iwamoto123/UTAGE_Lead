// Univapay売上CSVを 月別に集計して 月次PL の教材売上(白谷塾オンライン)と比較
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const R8_ONLINE = "33588258-2d8c-8160-ac00-d9a18a0238ed";

const CSV = "/Users/takeshi/Downloads/売上一覧_20260605234552.csv";
const text = fs.readFileSync(CSV, "utf8").replace(/^﻿/, "");
const lines = text.split("\n");

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

const byMonth = new Map();
const txns = [];
for (let i = 1; i < lines.length; i++) {
  const c = splitCSV(lines[i]);
  if (!c[0] || !c[0].includes("-")) continue;
  const date = c[0].trim().slice(0, 10); // "2026-06-02"
  const ym = date.slice(0, 7);
  const product = c[1].replace(/^"|"$/g, "");
  const amount = parseInt((c[3] || "").replace(/[,"]/g, ""), 10);
  const name = c[7].replace(/^"|"$/g, "");
  if (!amount) continue;
  txns.push({ date, ym, product, amount, name });
  byMonth.set(ym, (byMonth.get(ym) ?? 0) + amount);
}

console.log("=== Univapay取引一覧 ===");
for (const t of txns) console.log(`  ${t.date}  ${t.name.padEnd(10)}  ¥${t.amount.toLocaleString()}  ${t.product.slice(0, 40)}`);

console.log("\n=== 月別集計 ===");
for (const [ym, total] of [...byMonth].sort()) {
  console.log(`  ${ym}: ¥${total.toLocaleString()}`);
}

console.log("\n=== 既存 月次PL 教材売上 (白谷塾オンライン R8) と差分 ===");
for (const ym of [...byMonth.keys()].sort()) {
  const res = await notion.dataSources.query({
    data_source_id: DS_ID,
    filter: { and: [
      { property: "対象月", date: { equals: `${ym}-01` } },
      { property: "事業-年度", relation: { contains: R8_ONLINE } },
    ]},
    page_size: 1,
  });
  const csvTotal = byMonth.get(ym);
  if (res.results.length === 0) {
    console.log(`  ${ym}: 月次PLレコードなし → 新規作成して教材売上 ¥${csvTotal.toLocaleString()} 必要`);
    continue;
  }
  const p = res.results[0];
  const existing = p.properties["教材売上"]?.number ?? 0;
  const diff = csvTotal - existing;
  const status = diff === 0 ? "✓ 一致 (反映不要)"
    : diff > 0 ? `+ 不足 ¥${diff.toLocaleString()} (追加投入)`
    : `- 過剰 ¥${(-diff).toLocaleString()} (既存値が大きい)`;
  console.log(`  ${ym}: CSV=¥${csvTotal.toLocaleString()} vs 既存=¥${existing.toLocaleString()}  →  ${status}`);
}
