import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const rows = await all("72ee6524-b6fa-4426-a2f2-1e909d0dd7b0");
const N = (p, k) => p.properties[k]?.number ?? null;
const T = (p) => p.properties["名前"]?.title?.map(t => t.plain_text).join("") ?? "";
const S = (p, k) => p.properties[k]?.select?.name ?? null;
const D = (p, k) => p.properties[k]?.date?.start ?? null;
const v = rows.map(p => ({ n: T(p), k: N(p, "入会金"), g: N(p, "月謝"), st: S(p, "ステータス"), nyu: D(p, "入塾月") }));
const has = v.filter(x => x.k != null);
console.log(`入会金の入力あり ${has.length}/${rows.length}名`);
const dist = {}; for (const x of has) dist[x.k] = (dist[x.k] ?? 0) + 1;
for (const [k, c] of Object.entries(dist).sort((a, b) => b[0] - a[0])) console.log(`  ¥${Number(k).toLocaleString()}: ${c}名`);
console.log("\n2026-04以降に入塾した人の入会金:");
for (const x of v.filter(x => x.nyu && x.nyu >= "2026-04").sort((a, b) => (a.nyu ?? "").localeCompare(b.nyu ?? "")))
  console.log(`  ${x.nyu}  ${(x.n ?? "").padEnd(14)} 入会金 ${x.k == null ? "未入力" : "¥" + x.k.toLocaleString()}  月謝 ${x.g ? "¥" + x.g.toLocaleString() : "-"}`);
