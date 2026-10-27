// R8 塾生DB に「流入企画」（キャンペーンマスターへのリレーション）を追加し、
// R8 面談・体験生徒DB から氏名で名寄せして転記する
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_JUKU = "72ee6524-b6fa-4426-a2f2-1e909d0dd7b0";
const DS_MEN = "e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb";
const DS_CAMP = "8e8bab1e-37de-4739-a814-b5108901523c";
const DB_CAMP = "9ad5f4f4-d9ce-4e78-9f99-6a7ea59da030";
const DRY = process.argv.includes("--dry");
const ADD_PROP = process.argv.includes("--add-prop");
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const G = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "title") return v.title?.map(t => t.plain_text).join("");
  if (v.type === "relation") return v.relation?.map(r => r.id);
  if (v.type === "select") return v.select?.name; if (v.type === "date") return v.date?.start; return null; };

// ① プロパティを追加
const ds = await notion.dataSources.retrieve({ data_source_id: DS_JUKU });
const PROP = "流入キャンペーン";  // 既存の「流入企画」がアーカイブ済みDBを参照して壊れており、APIから触れないため別名で作成
if (!ds.properties[PROP]) {
  if (ADD_PROP && !DRY) {
    await notion.dataSources.update({ data_source_id: DS_JUKU, properties: {
      [PROP]: { relation: { data_source_id: DS_CAMP, type: "single_property", single_property: {} } },
    }});
    console.log(`✓ 塾生DBに「${PROP}」プロパティを追加しました`);
  } else {
    console.log(`! 塾生DBに「${PROP}」プロパティがありません（--add-prop で追加）`);
    if (!ADD_PROP) process.exit(0);
  }
} else console.log(`・「${PROP}」プロパティは既にあります`);

// ② 面談DBから転記
const camp = new Map();
for (const p of await all(DS_CAMP)) camp.set(p.id, p.properties["キャンペーン名"]?.title?.map(t => t.plain_text).join("") || "(無題)");
const men = await all(DS_MEN), juk = await all(DS_JUKU);
const norm = (s) => (s ?? "").replace(/[\s　]/g, "");
const ALIAS = { "山下彌耶乃": "山下ややの", "谷野理絵": "谷野理絵（母）", "大高陽夢": "大高はるむ", "川口朔はじめ": "川口朔くん", "一 将冴（はじめ しょうご）": "一将冴" };
const mMap = new Map(men.map(p => [norm(G(p, "名前")), p]));
let done = 0, skip = 0, none = 0;
console.log(`\n=== 面談DB → 塾生DB 流入企画の転記 ${DRY ? "【DRY RUN】" : ""} ===`);
for (const j of juk) {
  const n = G(j, "名前");
  const m = mMap.get(norm(n)) ?? (ALIAS[n] ? mMap.get(norm(ALIAS[n])) : null);
  if (!m) { none++; continue; }
  const ids = G(m, "流入企画") ?? [];
  if (!ids.length) { none++; continue; }
  const cur = G(j, PROP) ?? [];
  if (cur.length) { skip++; continue; }
  const names = ids.map(i => camp.get(i) ?? "(不明)").join("＋");
  console.log(`  ${DRY ? "would set" : "set"} ${(n ?? "").padEnd(16)} ← ${names}`);
  if (!DRY) await notion.pages.update({ page_id: j.id, properties: { [PROP]: { relation: ids.map(id => ({ id })) } } });
  done++;
}
console.log(`\n転記 ${done}名 / 既に設定済み ${skip}名 / 面談DBに流入企画なし ${none}名`);
console.log(DRY ? "DRY RUN 完了" : "完了");
