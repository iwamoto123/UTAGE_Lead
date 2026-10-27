import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
// ① 週次広告レポート 4〜8月 キャンペーン別
const rows = await all("f7788828-c0d8-4d5b-8cc0-2394ba947cd6");
const ad = {};
for (const p of rows) {
  const s = p.properties["期間"]?.date?.start; const amt = p.properties["消化金額"]?.number ?? 0;
  if (!s || amt <= 0) continue; const ym = s.slice(0, 7);
  if (ym < "2026-04" || ym > "2026-08") continue;
  const name = p.properties["キャンペーン名"]?.title?.map(t => t.plain_text).join("") || "(キャンペーン名なし)";
  (ad[name] ??= { total: 0, m: {} }); ad[name].total += amt; ad[name].m[ym] = (ad[name].m[ym] ?? 0) + amt;
}
console.log("=== 4〜8月 キャンペーン別 広告費 ===");
let tot = 0;
for (const [k, v] of Object.entries(ad).sort((a, b) => b[1].total - a[1].total)) {
  tot += v.total;
  console.log(`  ¥${v.total.toLocaleString().padStart(9)}  ${k}`);
  console.log(`             ${Object.entries(v.m).sort().map(([m, x]) => `${m.slice(5)}:¥${x.toLocaleString()}`).join(" / ")}`);
}
console.log(`  計 ¥${tot.toLocaleString()}`);
// ② 流入企画 × ファネル区分
const camp = new Map();
for (const p of await all("8e8bab1e-37de-4739-a814-b5108901523c")) camp.set(p.id, p.properties["キャンペーン名"]?.title?.map(t => t.plain_text).join("") || "(無題)");
const G = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "select") return v.select?.name; if (v.type === "date") return v.date?.start;
  if (v.type === "title") return v.title?.map(t => t.plain_text).join(""); if (v.type === "relation") return v.relation?.map(r => r.id);
  if (v.type === "formula") return v.formula?.string; if (v.type === "number") return v.number;
  if (v.type === "multi_select") return v.multi_select?.map(x => x.name); return null; };
const men = await all("e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb");
const juk = await all("72ee6524-b6fa-4426-a2f2-1e909d0dd7b0");
const norm = (s) => (s ?? "").replace(/[\s　]/g, "");
const jMap = new Map(juk.map(p => [norm(G(p, "名前")), p]));
const agg = {};
for (const p of men) {
  const d = G(p, "最終面談日"); if (!d || d < "2026-04" || d > "2026-09") continue;
  const cs = (G(p, "流入企画") ?? []).map(i => camp.get(i) ?? "(不明)");
  const key = cs.length ? cs[0] : "(流入企画 未設定)";
  const f = G(p, "ファネル区分") ?? "";
  const j = jMap.get(norm(G(p, "名前")));
  (agg[key] ??= { 面談: 0, 体験: 0, 入塾: 0, 月謝: 0, courses: {} });
  agg[key].面談++;
  if (f.startsWith("③") || f.startsWith("④")) agg[key].体験++;
  if (f.startsWith("④")) { agg[key].入塾++; agg[key].月謝 += j?.properties?.["月謝"]?.number ?? 0;
    for (const c of (j ? G(j, "コース") ?? [] : [])) agg[key].courses[c] = (agg[key].courses[c] ?? 0) + 1; }
}
console.log("\n=== 流入企画別 面談→体験→入塾（2026-04〜09の面談） ===");
for (const [k, v] of Object.entries(agg).sort((a, b) => b[1].面談 - a[1].面談))
  console.log(`  ${k.padEnd(40)} 面談${String(v.面談).padStart(2)} 体験${String(v.体験).padStart(2)} 入塾${String(v.入塾).padStart(2)} 月謝計¥${v.月謝.toLocaleString()}  ${Object.entries(v.courses).map(([a, b]) => `${a}×${b}`).join(",")}`);
// ③ コース別 学年・月謝
console.log("\n=== コース別 学年構成と月謝 ===");
const byC = {};
for (const p of juk) {
  const st = G(p, "ステータス"); const gs = G(p, "月謝") ?? 0; const gk = G(p, "現在の学年") ?? G(p, "学年") ?? "未設定";
  for (const c of (G(p, "コース") ?? ["(コース未設定)"])) { (byC[c] ??= []).push({ st, gs, gk, nyu: G(p, "入塾月"), end: G(p, "終了月（退会月）") }); }
}
for (const [c, v] of Object.entries(byC).sort((a, b) => b[1].length - a[1].length)) {
  const nz = v.filter(x => x.gs > 0);
  const gk = {}; for (const x of v) gk[x.gk] = (gk[x.gk] ?? 0) + 1;
  const 退会 = v.filter(x => x.st === "退会" || x.st === "休塾中").length;
  console.log(`  ${c.padEnd(18)} ${String(v.length).padStart(2)}名 月謝平均 ${nz.length ? "¥" + Math.round(nz.reduce((a, b) => a + b.gs, 0) / nz.length).toLocaleString() : "-"}  退会/休塾 ${退会}名  学年: ${Object.entries(gk).map(([a, b]) => `${a}${b}`).join(" ")}`);
}
