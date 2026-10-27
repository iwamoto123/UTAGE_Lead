import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DBS = { "R8 オンライン講師": "2d649d91-8c94-4264-a516-5c031af05fdd", "R8 ローカルメディ講師": "a6b57e73-5f9b-445c-9904-3fe37ddfed22", "R8 英検コース講師": "292ed607-f7f8-48e3-9dca-34b90ab8eb30" };
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
for (const [n, ds] of Object.entries(DBS)) {
  try {
    const rows = await all(ds);
    console.log(`\n=== ${n} (${rows.length}名) ===`);
    console.log("  " + rows.map(p => Object.values(p.properties).find(v => v.type === "title")?.title?.map(t => t.plain_text).join("")).filter(Boolean).join("、"));
  } catch (e) { console.log(`${n}: ${e.message.slice(0, 80)}`); }
}
