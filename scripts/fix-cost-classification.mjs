// 費用の分類を実態に合わせて修正
//  ① プリントパック：販売用在庫分を当期費用から外す（教材原価は販売時に計上）
//  ② アテナクリエイション（アドバイザー野口さん・毎月¥68,000）：7月以外の4ヶ月が未計上 → 追加
//  ③ 現金引出（業務委託への支払い・月謝返金）：その他経費 → 業務委託費 へ科目変更
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const R8 = { 宮崎教室: "33588258-2d8c-8172-a026-f20baacea13a", 白谷塾オンライン: "33588258-2d8c-8160-ac00-d9a18a0238ed", ローカルメディ: "33588258-2d8c-81ce-8737-dbf973eca362" };
const SHARE = { 宮崎教室: 133334 / 630000, 白谷塾オンライン: 363333 / 630000, ローカルメディ: 133333 / 630000 };
const DRY = process.argv.includes("--dry");
const TAG = "費用分類の修正(プリントパック在庫・アテナ毎月・現金引出の科目)";

// ① プリントパック 販売用在庫（令和7年度の仕入実績 192冊×¥1,500=¥288,000 と同数と仮定）を月按分で控除
const PP = { "2026-05": 250420, "2026-07": 330120 }, PP_TOTAL = 580540, STOCK = 288000;
// ② アテナクリエイション（宮崎教室の口座・毎月）7月以外
const ATENA = ["2026-04", "2026-05", "2026-06", "2026-08"], ATENA_AMT = 68000;
// ③ 現金引出（武士道口座）
const CASH = { "2026-05": 81000, "2026-06": 93000, "2026-07": 142000, "2026-08": 35000 };

const yen = (n) => "¥" + Math.round(n).toLocaleString();
async function page(ym, biz) {
  const r = await notion.dataSources.query({ data_source_id: DS, filter: { and: [{ property: "対象月", date: { equals: `${ym}-01` } }, { property: "事業-年度", relation: { contains: R8[biz] } }] }, page_size: 1 });
  return r.results[0] ?? null;
}
console.log(`=== 費用分類の修正 ${DRY ? "【DRY RUN】" : ""} ===\n`);
for (const ym of ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]) {
  const ppDeduct = PP[ym] ? Math.round(STOCK * PP[ym] / PP_TOTAL) : 0;
  const atena = ATENA.includes(ym) ? ATENA_AMT : 0;
  const cash = CASH[ym] ?? 0;
  if (!ppDeduct && !atena && !cash) continue;
  console.log(`【${ym}】` + [ppDeduct && `プリントパック在庫分 −${yen(ppDeduct)}（3事業按分）`, atena && `アテナクリエイション +${yen(atena)}（宮崎教室）`, cash && `現金引出 ${yen(cash)} を その他経費→業務委託費`].filter(Boolean).join(" / "));
  for (const biz of ["白谷塾オンライン", "宮崎教室", "ローカルメディ"]) {
    const p = await page(ym, biz); if (!p) { console.log(`  ! ${biz} レコードなし`); continue; }
    const hist = p.properties["アップロード履歴"]?.rich_text?.map(t => t.plain_text).join("") ?? "";
    if (hist.includes(TAG)) { console.log(`  ⏭ ${biz} 反映済み`); continue; }
    const sh = SHARE[biz];
    const prevSonota = p.properties["その他経費"]?.number ?? 0;
    const prevGyomu = p.properties["業務委託費"]?.number ?? 0;
    const prevGenka = p.properties["教材原価"]?.number ?? 0;
    const dPP = Math.round(ppDeduct * sh);
    const dAtena = biz === "宮崎教室" ? atena : 0;
    const dCash = Math.round(cash * sh);
    const newSonota = prevSonota - dPP + dAtena - dCash;
    const newGyomu = prevGyomu + dCash;
    const logs = [`その他経費 ${yen(prevSonota)}→${yen(newSonota)}`, `業務委託費 ${yen(prevGyomu)}→${yen(newGyomu)}`];
    console.log(`  ${DRY ? "would" : "set "} ${biz.padEnd(9)} ${logs.join(" / ")}`);
    if (DRY) continue;
    const ts = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    await notion.pages.update({ page_id: p.id, properties: {
      "その他経費": { number: newSonota }, "業務委託費": { number: newGyomu },
      "アップロード履歴": { rich_text: [{ text: { content: [hist, `${ts} ${TAG} ${biz}: ${logs.join(" / ")}`].filter(Boolean).join("\n") } }] },
    }});
  }
  console.log("");
}
console.log(DRY ? "DRY RUN 完了" : "完了");
