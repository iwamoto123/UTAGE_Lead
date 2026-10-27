import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS = process.env.NOTION_DS_UTAGE_DAILY_LEAD ?? "ff6be008-cddc-42ef-831f-9b327e056635";
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
try {
  const rows = await all(DS);
  console.log(`日次リードDB: ${rows.length}件`);
  if (rows[0]) console.log("プロパティ: " + Object.entries(rows[0].properties).map(([k, v]) => `${k}(${v.type})`).join(" / "));
  const agg = {};
  for (const p of rows) {
    const pr = p.properties;
    const d = pr["日付"]?.date?.start; if (!d) continue;
    const ym = d.slice(0, 7); if (ym < "2026-04") continue;
    const n = pr["新規読者数"]?.number ?? 0;
    const rl = pr["経路カテゴリ"]?.rollup?.array ?? [];
    const route = rl.map(x => x.select?.name ?? x.rich_text?.map(t=>t.plain_text).join("") ?? x.title?.map(t=>t.plain_text).join("")).filter(Boolean)[0] ?? (pr["名前"]?.title?.map(t=>t.plain_text).join("") || "不明");
    agg[ym] ??= {}; agg[ym][route] = (agg[ym][route] ?? 0) + n;
  }
  console.log("\n=== 月 × 経路 リード数 ===");
  for (const ym of Object.keys(agg).sort()) {
    const t = Object.values(agg[ym]).reduce((a, b) => a + b, 0);
    console.log(`${ym}: 計 ${t}`);
    for (const [k, v] of Object.entries(agg[ym]).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`    ${k}: ${v}`);
  }
  fs.writeFileSync("outputs/leads-2604-2608.json", JSON.stringify(agg, null, 2));
} catch (e) { console.log("リードDB取得エラー:", e.message); }
