import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const BIZ = { "33588258-2d8c-8172-a026-f20baacea13a": "宮崎", "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷", "33588258-2d8c-81ce-8737-dbf973eca362": "ローカル" };
// 通帳(銀行口座)から入る科目
const BANK = ["社員給与","地代家賃","水道光熱費","支払手数料","リース料","借入返済","法人間移動","外注費","業務委託費","減価償却費","その他経費","教材原価"];
for (const ym of ["2026-03","2026-04","2026-05","2026-06","2026-07","2026-08"]) {
  const r = await notion.dataSources.query({ data_source_id: DS, filter: { property: "対象月", date: { equals: `${ym}-01` } } });
  console.log(`\n===== ${ym} =====`);
  for (const p of r.results) {
    const b = BIZ[p.properties["事業-年度"]?.relation?.[0]?.id] ?? "?";
    const filled = BANK.filter(k => (p.properties[k]?.number ?? 0) !== 0);
    const hist = (p.properties["アップロード履歴"]?.rich_text?.map(t => t.plain_text).join("") ?? "").split("\n").filter(l => /銀行|通帳|口座/.test(l));
    console.log(`  [${b}] 入力済み科目: ${filled.length ? filled.join(", ") : "なし"}`);
    if (hist.length) for (const h of hist) console.log(`        履歴: ${h}`);
  }
}
