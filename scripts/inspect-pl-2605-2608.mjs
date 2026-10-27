import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const DS_WA = "f7788828-c0d8-4d5b-8cc0-2394ba947cd6";
const DS_CP = "8e8bab1e-37de-4739-a814-b5108901523c";
const BIZ = {
  "33588258-2d8c-8172-a026-f20baacea13a": "宮崎教室",
  "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷塾オンライン",
  "33588258-2d8c-81ce-8737-dbf973eca362": "ローカルメディ",
  "34088258-2d8c-81be-b53f-dce28c493c94": "宮崎教室(R7)",
  "33588258-2d8c-819c-a109-f95672dae188": "白谷塾オンライン(R7)",
  "33588258-2d8c-8122-8aeb-cb9285bbe650": "ローカルメディ(R7)",
};
// 月次PL
for (const ym of ["2026-05","2026-06","2026-07","2026-08"]) {
  const res = await notion.dataSources.query({ data_source_id: DS_PL, filter: { property: "対象月", date: { equals: `${ym}-01` } } });
  console.log(`\n=== 月次PL ${ym} (${res.results.length}件) ===`);
  for (const p of res.results) {
    const bizId = p.properties["事業-年度"]?.relation?.[0]?.id ?? "";
    const card = p.properties["広告費（カード明細）"]?.number;
    const board = p.properties["広告費（ボード集計）"]?.number;
    const ad = p.properties["広告費"]?.number;
    const hist = p.properties["アップロード履歴"]?.rich_text?.map(t=>t.plain_text).join("") ?? "";
    console.log(`  [${BIZ[bizId] ?? bizId}] カード明細=${card ?? "-"} / ボード集計=${board ?? "-"} / 広告費=${ad ?? "-"}`);
    if (hist) for (const l of hist.split("\n")) console.log(`      履歴: ${l}`);
  }
}
// プロパティ一覧
const one = await notion.dataSources.query({ data_source_id: DS_PL, page_size: 1 });
console.log("\n=== 月次PL プロパティ一覧 ===");
console.log(Object.entries(one.results[0].properties).map(([k,v])=>`${k}(${v.type})`).join("\n"));

// 週次広告レポート → 月×事業
const cpMap = new Map();
let cur;
do { const r = await notion.dataSources.query({ data_source_id: DS_CP, start_cursor: cur, page_size: 100 });
  for (const p of r.results) { const rel = p.properties["事業-年度"]?.relation?.[0]?.id; if (rel) cpMap.set(p.id, (BIZ[rel]??"その他").replace("(R7)","")); }
  cur = r.has_more ? r.next_cursor : undefined; } while (cur);
const agg = {};
cur = undefined;
do { const r = await notion.dataSources.query({ data_source_id: DS_WA, start_cursor: cur, page_size: 100 });
  for (const p of r.results) {
    const start = p.properties["期間"]?.date?.start; const amt = p.properties["消化金額"]?.number ?? 0;
    if (!start || amt <= 0) continue; const ym = start.slice(0,7);
    if (!["2026-05","2026-06","2026-07","2026-08"].includes(ym)) continue;
    const name = p.properties["キャンペーン名"]?.title?.map(t=>t.plain_text).join("") ?? "";
    const rel = p.properties["キャンペーン"]?.relation?.[0]?.id;
    let biz = rel ? cpMap.get(rel) : undefined;
    if (!biz) biz = (name.includes("ローカルメディ")||name.includes("再受験")||name.includes("高1・高2")||name.includes("高1高2")) ? "ローカルメディ" : (name ? "白谷塾オンライン" : "未分類");
    agg[ym] ??= {}; agg[ym][biz] = (agg[ym][biz] ?? 0) + amt;
  }
  cur = r.has_more ? r.next_cursor : undefined; } while (cur);
console.log("\n=== 週次広告レポート 月×事業 ===");
for (const ym of Object.keys(agg).sort()) { const t = Object.values(agg[ym]).reduce((a,b)=>a+b,0);
  console.log(`  ${ym}: 計 ¥${t.toLocaleString()}  ` + Object.entries(agg[ym]).map(([k,v])=>`${k}=¥${v.toLocaleString()}`).join(" / ")); }
