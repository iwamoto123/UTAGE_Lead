import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const BIZ = { "33588258-2d8c-8172-a026-f20baacea13a": "宮崎", "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷", "33588258-2d8c-81ce-8737-dbf973eca362": "ローカル" };
const MONTHS = ["2026-04","2026-05","2026-06","2026-07","2026-08"];
const NUM = ["売上","教材売上","その他売上","生徒数","高1人数","高2人数","高3人数","社員給与","人件費（バイト代）","業務委託費","広告費","広告費（カード明細）","SaaS利用料","通信費","地代家賃","水道光熱費","外注費","教材原価","リース料","支払手数料","減価償却費","その他経費","借入返済","法人間移動"];
const F = ["売上合計","人件費合計","販管費合計","営業利益","利益","営業利益率","利益率","広告費差分"];
const out = {};
for (const ym of MONTHS) {
  const res = await notion.dataSources.query({ data_source_id: DS_PL, filter: { property: "対象月", date: { equals: `${ym}-01` } } });
  out[ym] = {};
  for (const p of res.results) {
    const b = BIZ[p.properties["事業-年度"]?.relation?.[0]?.id]; if (!b) continue;
    const o = {};
    for (const k of NUM) o[k] = p.properties[k]?.number ?? null;
    for (const k of F) { const f = p.properties[k]?.formula; o[k] = f ? (f.number ?? f.string ?? null) : null; }
    out[ym][b] = o;
  }
}
fs.writeFileSync("outputs/pl-2604-2608.json", JSON.stringify(out, null, 2));
// 表示
const show = [...NUM, ...F];
for (const b of ["宮崎","白谷","ローカル"]) {
  console.log(`\n================ ${b} ================`);
  console.log("項目".padEnd(20) + MONTHS.map(m => m.slice(5).padStart(12)).join(""));
  for (const k of show) {
    const vals = MONTHS.map(m => out[m][b]?.[k]);
    if (vals.every(v => v == null || v === 0)) continue;
    console.log(k.padEnd(20) + vals.map(v => (v == null ? "-" : (Math.abs(v) < 10 && !Number.isInteger(v) ? v.toFixed(3) : Math.round(v).toLocaleString())).padStart(12)).join(""));
  }
}
console.log("\n================ 3事業合計 ================");
console.log("項目".padEnd(20) + MONTHS.map(m => m.slice(5).padStart(12)).join(""));
for (const k of [...NUM, "売上合計","人件費合計","販管費合計","営業利益","利益"]) {
  const vals = MONTHS.map(m => ["宮崎","白谷","ローカル"].reduce((a, b) => a + (out[m][b]?.[k] ?? 0), 0));
  if (vals.every(v => !v)) continue;
  console.log(k.padEnd(20) + vals.map(v => Math.round(v).toLocaleString().padStart(12)).join(""));
}
