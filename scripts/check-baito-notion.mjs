// Notion 月次PL DB の人件費（バイト代）を月×事業で取得し、CSV集計と突合
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const MONTHLY_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674";

const R8_MIYAZAKI = "335882582d8c8172a026f20baacea13a";
const R8_ONLINE = "335882582d8c8160ac00d9a18a0238ed";
const R8_LOCALMEDI = "335882582d8c81ce8737dbf973eca362";
const R7_MIYAZAKI = "340882582d8c81beb53fdce28c493c94";
const R7_ONLINE = "335882582d8c819ca109f95672dae188";
const R7_LOCALMEDI = "335882582d8c81228aebcb9285bbe650";
const MAP = {
  [R8_MIYAZAKI]: "宮崎教室", [R7_MIYAZAKI]: "宮崎教室",
  [R8_ONLINE]: "白谷塾オンライン", [R7_ONLINE]: "白谷塾オンライン",
  [R8_LOCALMEDI]: "ローカルメディ", [R7_LOCALMEDI]: "ローカルメディ",
};

const all = [];
let cursor;
do {
  const res = await notion.dataSources.query({
    data_source_id: MONTHLY_PL, start_cursor: cursor, page_size: 100,
  });
  all.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

const notionTotal = {};
for (const p of all) {
  const props = p.properties;
  const dateStr = props["対象月"]?.date?.start;
  if (!dateStr) continue;
  const ym = dateStr.slice(0, 7);
  const relId = props["事業-年度"]?.relation?.[0]?.id?.replaceAll("-", "");
  const biz = MAP[relId] ?? "その他";
  const baito = props["人件費（バイト代）"]?.number ?? 0;
  notionTotal[`${biz}|${ym}`] = baito;
}

const csv = JSON.parse(fs.readFileSync("scripts/baito-parsed.json", "utf8"));
const csvTotal = {};
for (const e of csv.businessMonth) csvTotal[`${e.business}|${e.ym}`] = e.total;

const keys = new Set([...Object.keys(notionTotal), ...Object.keys(csvTotal)]);
const targets = [...keys].filter((k) => {
  const ym = k.split("|")[1];
  return ym >= "2025-05" && ym <= "2026-04";
}).sort();

console.log("事業 | 対象月 | Notion計上 | CSV集計 | 差分");
console.log("-".repeat(70));
let totalDiff = 0;
for (const k of targets) {
  const [biz, ym] = k.split("|");
  const n = notionTotal[k] ?? 0;
  const c = csvTotal[k] ?? 0;
  const diff = c - n;
  totalDiff += Math.abs(diff);
  const flag = diff === 0 ? "✓" : (Math.abs(diff) < 1000 ? "△" : "✗");
  console.log(`${biz.padEnd(10, "　")} ${ym}  ¥${String(n).padStart(10)}  ¥${String(c).padStart(10)}  ${diff>=0?"+":""}¥${String(diff).padStart(9)}  ${flag}`);
}
console.log("-".repeat(70));
console.log(`合計差分絶対値: ¥${totalDiff.toLocaleString()}`);
