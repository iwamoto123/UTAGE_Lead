import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const rows = await all("f7788828-c0d8-4d5b-8cc0-2394ba947cd6");
const agg = {};
for (const p of rows) {
  const s = p.properties["期間"]?.date?.start; const amt = p.properties["消化金額"]?.number ?? 0;
  if (!s || amt <= 0) continue; const ym = s.slice(0, 7);
  if (!["2026-07", "2026-08"].includes(ym)) continue;
  const name = p.properties["キャンペーン名"]?.title?.map(t => t.plain_text).join("") ?? "(無題)";
  (agg[ym] ??= {})[name] = (agg[ym][name] ?? 0) + amt;
}
for (const ym of Object.keys(agg).sort()) {
  const t = Object.values(agg[ym]).reduce((a, b) => a + b, 0);
  console.log(`\n=== ${ym} 週次広告レポート キャンペーン別 (計 ¥${t.toLocaleString()}) ===`);
  for (const [k, v] of Object.entries(agg[ym]).sort((a, b) => b[1] - a[1])) console.log(`  ¥${v.toLocaleString().padStart(9)}  ${k}`);
}
