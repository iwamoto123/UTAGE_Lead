import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const BIZ = { "33588258-2d8c-8172-a026-f20baacea13a": "宮崎", "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷", "33588258-2d8c-81ce-8737-dbf973eca362": "ローカル" };
const G = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "select") return v.select?.name; if (v.type === "date") return v.date?.start;
  if (v.type === "number") return v.number; if (v.type === "title") return v.title?.map(t => t.plain_text).join("");
  if (v.type === "relation") return v.relation?.map(r => r.id); if (v.type === "multi_select") return v.multi_select?.map(x => x.name);
  return null; };
const rows = await all("72ee6524-b6fa-4426-a2f2-1e909d0dd7b0");
const out = rows.map(p => ({ name: G(p, "名前"), biz: (G(p, "事業-年度") ?? []).map(i => BIZ[i]).filter(Boolean)[0] ?? "不明",
  st: G(p, "ステータス"), gakunen: G(p, "現在の学年") ?? G(p, "学年"), gessha: G(p, "月謝"),
  nyu: G(p, "入塾月"), end: G(p, "終了月（退会月）"), course: G(p, "コース") }));
fs.writeFileSync("outputs/jukusei-detail.json", JSON.stringify(out, null, 2));
console.log(`塾生DB ${out.length}名`);
const g = {}; for (const j of out) { const k = `${j.biz}/${j.gakunen ?? "未設定"}`; (g[k] ??= []).push(j); }
console.log("\n=== 事業×学年 × 月謝 ===");
for (const [k, v] of Object.entries(g).sort()) {
  const gs = v.filter(x => x.gessha > 0).map(x => x.gessha);
  console.log(`  ${k.padEnd(14)} ${String(v.length).padStart(2)}名  月謝平均 ${gs.length ? "¥" + Math.round(gs.reduce((a, b) => a + b, 0) / gs.length).toLocaleString() : "-"}  (${v.map(x => x.st).join(",")})`);
}
console.log("\n=== コース別 ===");
const c = {}; for (const j of out) for (const cc of (j.course ?? ["(未設定)"])) { (c[cc] ??= []).push(j.gessha ?? 0); }
for (const [k, v] of Object.entries(c).sort((a, b) => b[1].length - a[1].length)) {
  const nz = v.filter(x => x > 0);
  console.log(`  ${k.padEnd(22)} ${String(v.length).padStart(2)}名  平均 ${nz.length ? "¥" + Math.round(nz.reduce((a, b) => a + b, 0) / nz.length).toLocaleString() : "-"}`);
}
console.log("\n=== 在籍期間（入塾月→現在 or 退会月） ===");
const mm = (a, b) => (new Date(b).getFullYear() - new Date(a).getFullYear()) * 12 + (new Date(b).getMonth() - new Date(a).getMonth());
const dur = out.filter(j => j.nyu).map(j => ({ ...j, m: mm(j.nyu, j.end ?? "2026-09-01") + 1 }));
for (const j of dur.sort((a, b) => b.m - a.m)) console.log(`  ${(j.name ?? "").padEnd(12)} ${j.biz.padEnd(5)} ${String(j.gakunen ?? "-").padEnd(4)} ${j.nyu}〜${j.end ?? "在籍"} ${String(j.m).padStart(2)}ヶ月 月謝${(j.gessha ?? 0).toLocaleString()} ${j.st}`);
