import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const rows = await all("4456ac78-5543-43a9-8078-a74f61705bed");
const N = (p, k) => p.properties[k]?.number ?? null;
const S = (p, k) => p.properties[k]?.select?.name ?? null;
const D = (p, k) => p.properties[k]?.date?.start ?? null;
const T = (p, k) => p.properties[k]?.title?.map(t => t.plain_text).join("") ?? "";
const list = rows.map(p => ({ t: T(p, "動画タイトル"), ch: S(p, "チャンネル"), pub: D(p, "公開日"), days: N(p, "経過日数"), views: N(p, "再生数"), line: N(p, "LINE追加数") }))
  .filter(x => x.line != null).sort((a, b) => b.line - a.line);
for (const x of list) console.log(`  ${String(x.line).padStart(3)}件  再生${String(x.views ?? "-").padStart(6)}  ${String(x.days ?? "-").padStart(3)}日  ${(x.ch ?? "").padEnd(12)} ${x.t.slice(0, 32)}`);
const tot = list.reduce((a, b) => a + b.line, 0);
const nz = list.filter(x => x.line > 0);
console.log(`\n入力済 ${list.length}本 / LINE追加 合計 ${tot}件 / 平均 ${(tot / list.length).toFixed(2)}件`);
console.log(`LINE追加が1件以上: ${nz.length}/${list.length}本 (${Math.round(nz.length / list.length * 100)}%)  ゼロ: ${list.length - nz.length}本`);
const byd = list.filter(x => x.days != null).sort((a,b)=>a.days-b.days);
console.log(`経過日数 中央値 ${byd[Math.floor(byd.length/2)]?.days}日 (最小${byd[0]?.days}/最大${byd[byd.length-1]?.days})`);
const v = list.map(x => x.views).filter(x => x != null).sort((a,b)=>a-b);
console.log(`再生数 合計 ${v.reduce((a,b)=>a+b,0).toLocaleString()} / 平均 ${Math.round(v.reduce((a,b)=>a+b,0)/v.length).toLocaleString()} / 中央値 ${v[Math.floor(v.length/2)].toLocaleString()}`);
