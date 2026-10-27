import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const YT = "4456ac78-5543-43a9-8078-a74f61705bed";
const LN = "38e4dd0a-d0a8-4513-aaf2-7f980f00a4b5";
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const G = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "select") return v.select?.name ?? null;
  if (v.type === "date") return v.date?.start ?? null;
  if (v.type === "number") return v.number ?? null;
  if (v.type === "title") return v.title?.map(t => t.plain_text).join("") || null;
  return null; };
for (const [name, ds, dateKey, chKey] of [["YouTube KPI", YT, "公開日", "チャンネル"], ["LINE配信 KPI", LN, "配信日", "公式LINEアカウント"]]) {
  try {
    const rows = await all(ds);
    console.log(`\n######## ${name}: ${rows.length}件 ########`);
    console.log("プロパティ: " + Object.keys(rows[0]?.properties ?? {}).join(" / "));
    const bym = {}, bych = {};
    for (const p of rows) { const d = G(p, dateKey); const ym = d ? d.slice(0, 7) : "(日付なし)";
      bym[ym] = (bym[ym] ?? 0) + 1; const ch = G(p, chKey) ?? "(未設定)"; bych[ch] = (bych[ch] ?? 0) + 1; }
    console.log("— 月別 —"); for (const [k, v] of Object.entries(bym).sort()) console.log(`   ${k}: ${v}本`);
    console.log("— チャンネル/アカウント別 —"); for (const [k, v] of Object.entries(bych).sort((a, b) => b[1] - a[1])) console.log(`   ${k}: ${v}`);
    if (name.startsWith("YouTube")) {
      const vw = rows.map(p => G(p, "再生数")).filter(x => x != null);
      const la = rows.map(p => G(p, "LINE追加数")).filter(x => x != null);
      console.log(`— 再生数: 入力${vw.length}件 平均${vw.length ? Math.round(vw.reduce((a,b)=>a+b,0)/vw.length) : 0}`);
      console.log(`— LINE追加数: 入力${la.length}件 合計${la.reduce((a,b)=>a+b,0)} 平均${la.length ? (la.reduce((a,b)=>a+b,0)/la.length).toFixed(1) : 0}`);
    }
  } catch (e) { console.log(`${name}: 取得エラー ${e.message}`); }
}
