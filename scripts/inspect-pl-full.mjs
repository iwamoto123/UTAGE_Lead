import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const BIZ = { "33588258-2d8c-8172-a026-f20baacea13a": "宮崎", "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷", "33588258-2d8c-81ce-8737-dbf973eca362": "ローカル" };
const COLS = ["売上","生徒数","教材売上","その他売上","社員給与","人件費（バイト代）","業務委託費","広告費","広告費（カード明細）","SaaS利用料","通信費","地代家賃","水道光熱費","外注費","教材原価","リース料","支払手数料","減価償却費","その他経費","借入返済","法人間移動"];
for (const ym of ["2026-05","2026-06","2026-07","2026-08"]) {
  const res = await notion.dataSources.query({ data_source_id: DS_PL, filter: { property: "対象月", date: { equals: `${ym}-01` } } });
  console.log(`\n=== ${ym} ===`);
  const rows = res.results.map(p => ({ biz: BIZ[p.properties["事業-年度"]?.relation?.[0]?.id] ?? "?", p }));
  const w = 20;
  console.log("項目".padEnd(w) + rows.map(r=>r.biz.padStart(12)).join(""));
  for (const c of COLS) {
    const vals = rows.map(r => r.p.properties[c]?.number);
    if (vals.every(v => v == null || v === 0)) continue;
    console.log(c.padEnd(w) + vals.map(v => (v==null?"-":v.toLocaleString()).padStart(12)).join(""));
  }
}
