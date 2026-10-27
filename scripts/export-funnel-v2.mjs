import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_MENDAN = "e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb";
const DS_JUKUSEI = "72ee6524-b6fa-4426-a2f2-1e909d0dd7b0";
const BIZ = { "33588258-2d8c-8172-a026-f20baacea13a": "宮崎", "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷", "33588258-2d8c-81ce-8737-dbf973eca362": "ローカル",
              "34088258-2d8c-81be-b53f-dce28c493c94": "宮崎", "33588258-2d8c-819c-a109-f95672dae188": "白谷", "33588258-2d8c-8122-8aeb-cb9285bbe650": "ローカル" };
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const G = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "select") return v.select?.name ?? null;
  if (v.type === "date") return v.date?.start ?? null;
  if (v.type === "title") return v.title?.map(t => t.plain_text).join("").trim() || null;
  if (v.type === "relation") return v.relation?.map(r => r.id) ?? [];
  if (v.type === "formula") return v.formula?.string ?? v.formula?.number ?? null;
  return null; };
const biz = (p) => (G(p, "事業-年度") ?? []).map(id => BIZ[id]).filter(Boolean)[0] ?? "不明";
const norm = (s) => (s ?? "").replace(/[\s　]/g, "");

const mendan = await all(DS_MENDAN);
const jukusei = await all(DS_JUKUSEI);
console.log(`面談・体験生徒 ${mendan.length}件 / 塾生 ${jukusei.length}件`);

const jNames = new Map(jukusei.map(p => [norm(G(p, "名前")), p]));
const dup = mendan.filter(p => jNames.has(norm(G(p, "名前"))));
console.log(`両DBに同名で存在: ${dup.length}件`);

console.log("\n=== 塾生DB ステータス分布 ===");
const sc = {}; for (const p of jukusei) { const s = G(p, "ステータス") ?? "(未入力)"; sc[s] = (sc[s] ?? 0) + 1; }
for (const [k, v] of Object.entries(sc).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log("\n=== 塾生DB 入塾月の分布 ===");
const im = {}; for (const p of jukusei) { const d = G(p, "入塾月"); const k = d ? d.slice(0, 7) : "(未入力)"; im[k] = (im[k] ?? 0) + 1; }
for (const [k, v] of Object.entries(im).sort()) console.log(`  ${k}: ${v}`);
console.log("\n=== 面談DB ファネル区分の分布 ===");
const fc = {}; for (const p of mendan) { const f = G(p, "ファネル区分") ?? "(空)"; fc[f] = (fc[f] ?? 0) + 1; }
for (const [k, v] of Object.entries(fc).sort()) console.log(`  ${k}: ${v}`);
console.log("\n=== 面談DB 体験開始日の分布 ===");
const tb = {}; for (const p of mendan) { const d = G(p, "体験開始日"); const k = d ? d.slice(0, 7) : "(未入力)"; tb[k] = (tb[k] ?? 0) + 1; }
for (const [k, v] of Object.entries(tb).sort()) console.log(`  ${k}: ${v}`);
console.log("\n=== 塾生DB 体験開始日の分布 ===");
const tb2 = {}; for (const p of jukusei) { const d = G(p, "体験開始日"); const k = d ? d.slice(0, 7) : "(未入力)"; tb2[k] = (tb2[k] ?? 0) + 1; }
for (const [k, v] of Object.entries(tb2).sort()) console.log(`  ${k}: ${v}`);
console.log("\n=== 塾生DB 最終面談日の分布 ===");
const mm = {}; for (const p of jukusei) { const d = G(p, "最終面談日"); const k = d ? d.slice(0, 7) : "(未入力)"; mm[k] = (mm[k] ?? 0) + 1; }
for (const [k, v] of Object.entries(mm).sort()) console.log(`  ${k}: ${v}`);
console.log("\n=== 塾生DB 退会月の分布 ===");
const em = {}; for (const p of jukusei) { const d = G(p, "終了月（退会月）"); if (!d) continue; const k = d.slice(0, 7); em[k] = (em[k] ?? 0) + 1; }
for (const [k, v] of Object.entries(em).sort()) console.log(`  ${k}: ${v}`);

fs.writeFileSync("outputs/funnel-raw.json", JSON.stringify({
  mendan: mendan.map(p => ({ name: G(p, "名前"), biz: biz(p), st: G(p, "ステータス"), res: G(p, "結果"), funnel: G(p, "ファネル区分"), mendanDate: G(p, "最終面談日"), taikenDate: G(p, "体験開始日") })),
  jukusei: jukusei.map(p => ({ name: G(p, "名前"), biz: biz(p), st: G(p, "ステータス"), nyujuku: G(p, "入塾月"), taikenDate: G(p, "体験開始日"), mendanDate: G(p, "最終面談日"), end: G(p, "終了月（退会月）"), gessha: p.properties["月謝"]?.number ?? null })),
}, null, 2));
