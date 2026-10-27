import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_MENDAN = "e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb";
const BIZ = { "33588258-2d8c-8172-a026-f20baacea13a": "宮崎", "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷", "33588258-2d8c-81ce-8737-dbf973eca362": "ローカル" };
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const rows = await all(DS_MENDAN);
console.log(`面談・体験生徒DB: ${rows.length}件`);
const props = rows[0]?.properties ?? {};
console.log("プロパティ: " + Object.entries(props).map(([k, v]) => `${k}(${v.type})`).join(" / "));
const g = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "select") return v.select?.name ?? null;
  if (v.type === "status") return v.status?.name ?? null;
  if (v.type === "date") return v.date?.start ?? null;
  if (v.type === "rich_text") return v.rich_text?.map(t => t.plain_text).join("") || null;
  if (v.type === "title") return v.title?.map(t => t.plain_text).join("") || null;
  if (v.type === "relation") return v.relation?.map(r => r.id) ?? [];
  return null; };
const tbl = {};
const detail = [];
for (const p of rows) {
  const d = g(p, "最終面談日"); const ym = d ? d.slice(0, 7) : "未設定";
  const st = g(p, "ステータス"); const res = g(p, "結果");
  const biz = (g(p, "事業-年度") ?? []).map(id => BIZ[id]).filter(Boolean)[0] ?? "不明";
  tbl[ym] ??= {}; tbl[ym][biz] ??= { 面談: 0, 体験: 0, 入塾: 0, 断り: 0, 検討中: 0, 返信なし: 0 };
  tbl[ym][biz].面談++;
  if (res?.includes("入塾")) tbl[ym][biz].入塾++;
  else if (res?.includes("断り")) tbl[ym][biz].断り++;
  else if (res?.includes("返信")) tbl[ym][biz].返信なし++;
  if (st === "体験中" && !res) tbl[ym][biz].体験++;
  if (st?.includes("検討")) tbl[ym][biz].検討中++;
  detail.push({ name: g(p, "名前"), ym, biz, st, res });
}
console.log("\n=== 最終面談日の月 × 事業 ===");
console.log("月".padEnd(10) + "事業".padEnd(8) + ["面談","体験中","入塾","断り","返信なし","検討中"].map(s => s.padStart(8)).join(""));
for (const ym of Object.keys(tbl).sort()) for (const [b, v] of Object.entries(tbl[ym]))
  console.log(ym.padEnd(10) + b.padEnd(8) + [v.面談, v.体験, v.入塾, v.断り, v.返信なし, v.検討中].map(n => String(n).padStart(8)).join(""));
console.log("\n=== 結果の分布(全体) ===");
const rc = {}; for (const d of detail) rc[d.res ?? "(未入力)"] = (rc[d.res ?? "(未入力)"] ?? 0) + 1;
for (const [k, v] of Object.entries(rc).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log("\n=== ステータスの分布(全体) ===");
const sc = {}; for (const d of detail) sc[d.st ?? "(未入力)"] = (sc[d.st ?? "(未入力)"] ?? 0) + 1;
for (const [k, v] of Object.entries(sc).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
fs.writeFileSync("outputs/funnel-2604-2608.json", JSON.stringify({ tbl, detail }, null, 2));
