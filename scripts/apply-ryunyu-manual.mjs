// 手動で判明した14名の流入経路を塾生DBの「流入キャンペーン」へ反映
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_JUKU = "72ee6524-b6fa-4426-a2f2-1e909d0dd7b0", DS_CAMP = "8e8bab1e-37de-4739-a814-b5108901523c";
const PROP = "流入キャンペーン";
const DRY = process.argv.includes("--dry");
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const title = (p) => p.properties["キャンペーン名"]?.title?.map(t => t.plain_text).join("") || p.properties["名前"]?.title?.map(t => t.plain_text).join("") || "";

// 生徒 → キャンペーン名（マスターの表記に合わせる）
const MAP = {
  "中山蒼衣": "9月模試対策（メインLINE）",
  "髙木憩": "R8 夏期講習 保護者向け",
  "前田和樹": "R8 夏期講習 保護者向け",
  "岡本祐": "R8 夏期講習 保護者向け",
  "一 将冴（はじめ しょうご）": "高1高2 無料Zoom相談（ローカルメディ）",
  "志岐瑠香": "高1高2 無料Zoom相談（ローカルメディ）",
  "中川陽翔": "高1高2 無料Zoom相談（ローカルメディ）",
  "服部恵大": "YouTube→LINE自然流入（白谷塾オンライン教室メイン）",
  "長嶺克紀": "浪人生・再受験生 個別相談",
  "矢﨑幹人": "スタートダッシュプログラム",
  "大沢はるき": "元塾生（再入塾）",
  "石田莉羽": "昨年度からの継続",
  "中村楼沙": "昨年度からの継続",
  "高瀬朋香": "昨年度からの継続",
};
const NEW = ["元塾生（再入塾）", "昨年度からの継続"];

const camps = await all(DS_CAMP);
const byName = new Map(camps.map(p => [title(p), p.id]));
console.log(`=== 流入経路の手動反映 ${DRY ? "【DRY RUN】" : ""} ===\n`);
for (const n of NEW) {
  if (byName.has(n)) { console.log(`・キャンペーン「${n}」は既にあります`); continue; }
  if (DRY) { console.log(`would create キャンペーン「${n}」`); byName.set(n, "DRY"); continue; }
  const c = await notion.pages.create({ parent: { data_source_id: DS_CAMP }, properties: { "キャンペーン名": { title: [{ text: { content: n } }] } } });
  byName.set(n, c.id);
  console.log(`✓ キャンペーン「${n}」を作成しました`);
}
const juku = await all(DS_JUKU);
const norm = (s) => (s ?? "").replace(/[\s　]/g, "");
const jMap = new Map(juku.map(p => [norm(title(p)), p]));
console.log("");
let ok = 0, ng = 0;
for (const [name, cname] of Object.entries(MAP)) {
  const j = jMap.get(norm(name));
  if (!j) { console.log(`  ! 塾生DBに「${name}」が見つかりません`); ng++; continue; }
  const cid = byName.get(cname);
  if (!cid) { console.log(`  ! キャンペーン「${cname}」が見つかりません`); ng++; continue; }
  console.log(`  ${DRY ? "would set" : "set"} ${name.padEnd(18)} ← ${cname}`);
  if (!DRY) await notion.pages.update({ page_id: j.id, properties: { [PROP]: { relation: [{ id: cid }] } } });
  ok++;
}
console.log(`\n反映 ${ok}件 / 失敗 ${ng}件`);
console.log(DRY ? "DRY RUN 完了" : "完了");
