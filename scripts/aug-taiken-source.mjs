import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const camp = new Map();
for (const p of await all("8e8bab1e-37de-4739-a814-b5108901523c")) camp.set(p.id, p.properties["キャンペーン名"]?.title?.map(t => t.plain_text).join("") ?? "(無題)");
const rows = await all("e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb");
const G = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "select") return v.select?.name; if (v.type === "date") return v.date?.start;
  if (v.type === "title") return v.title?.map(t => t.plain_text).join(""); if (v.type === "relation") return v.relation?.map(r => r.id);
  if (v.type === "formula") return v.formula?.string; return null; };
console.log("=== 2026-08 に面談した生徒の流入企画 ===");
const agg = {};
for (const p of rows) {
  const d = G(p, "最終面談日"); if (!d?.startsWith("2026-08")) continue;
  const cs = (G(p, "流入企画") ?? []).map(id => camp.get(id) ?? "(不明ID)");
  const key = cs.length ? cs.join("＋") : "(未設定)";
  agg[key] = (agg[key] ?? 0) + 1;
  console.log(`  ${(G(p, "名前") ?? "").padEnd(10)} ${d} ${(G(p, "ステータス") ?? "").padEnd(7)} ${(G(p, "ファネル区分") ?? "").padEnd(10)} 流入: ${key}`);
}
console.log("\n— 集計 —");
for (const [k, v] of Object.entries(agg).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}名`);
console.log("\n=== 2026-07 の流入企画 集計 ===");
const a7 = {};
for (const p of rows) { const d = G(p, "最終面談日"); if (!d?.startsWith("2026-07")) continue;
  const cs = (G(p, "流入企画") ?? []).map(id => camp.get(id) ?? "(不明ID)");
  const key = cs.length ? cs.join("＋") : "(未設定)"; a7[key] = (a7[key] ?? 0) + 1; }
for (const [k, v] of Object.entries(a7).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}名`);
