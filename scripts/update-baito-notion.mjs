// Notion 月次PL DBのバイト代を新ロジックで上書き
// 使い方:
//   node scripts/update-baito-notion.mjs            # ドライラン（差分表示のみ）
//   node scripts/update-baito-notion.mjs --apply    # 実際に上書き
import { Client } from "@notionhq/client";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const APPLY = process.argv.includes("--apply");
const MONTHLY_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674";

const R8_MIYAZAKI = "335882582d8c8172a026f20baacea13a";
const R8_ONLINE = "335882582d8c8160ac00d9a18a0238ed";
const R8_LOCALMEDI = "335882582d8c81ce8737dbf973eca362";
const R7_MIYAZAKI = "340882582d8c81beb53fdce28c493c94";
const R7_ONLINE = "335882582d8c819ca109f95672dae188";
const R7_LOCALMEDI = "335882582d8c81228aebcb9285bbe650";

function fy(ym) {
  const [y, m] = ym.split("-").map(Number);
  if (y === 2025 && m >= 4) return "R7";
  if (y === 2026 && m <= 3) return "R7";
  if (y === 2026 && m >= 4) return "R8";
  if (y === 2027 && m <= 3) return "R8";
  return "R8";
}
function bizYearId(business, ym) {
  const f = fy(ym);
  const map = {
    R7: { 宮崎教室: R7_MIYAZAKI, 白谷塾オンライン: R7_ONLINE, ローカルメディ: R7_LOCALMEDI },
    R8: { 宮崎教室: R8_MIYAZAKI, 白谷塾オンライン: R8_ONLINE, ローカルメディ: R8_LOCALMEDI },
  };
  return map[f][business];
}
const TITLE_BUSINESS = {
  宮崎教室: "白谷塾宮崎教室",
  白谷塾オンライン: "白谷塾オンライン",
  ローカルメディ: "ローカルメディ",
};

async function findOrCreate(ym, business) {
  const monthStart = `${ym}-01`;
  const byId = bizYearId(business, ym);
  const res = await notion.dataSources.query({
    data_source_id: MONTHLY_PL,
    filter: {
      and: [
        { property: "対象月", date: { equals: monthStart } },
        { property: "事業-年度", relation: { contains: byId } },
      ],
    },
    page_size: 5,
  });
  if (res.results.length > 0) {
    const p = res.results[0];
    const current = p.properties["人件費（バイト代）"]?.number ?? 0;
    return { id: p.id, current, created: false };
  }
  if (!APPLY) return { id: null, current: 0, created: false, willCreate: true };
  const [y, m] = ym.split("-");
  const title = `${y}年${parseInt(m, 10)}月 ${TITLE_BUSINESS[business]}`;
  const created = await notion.pages.create({
    parent: { data_source_id: MONTHLY_PL },
    properties: {
      月: { title: [{ text: { content: title } }] },
      対象月: { date: { start: monthStart } },
      "事業-年度": { relation: [{ id: byId }] },
    },
  });
  return { id: created.id, current: 0, created: true };
}

// 新ロジックの目標値ロード
const data = JSON.parse(fs.readFileSync("scripts/baito-parsed.json", "utf8"));
const target = new Map(); // key: business|ym → amount
for (const e of data.businessMonth) target.set(`${e.business}|${e.ym}`, e.total);

// 対象範囲: 2025-05〜2026-04 × 3事業
const BUSINESSES = ["宮崎教室", "白谷塾オンライン", "ローカルメディ"];
const MONTHS = [];
for (let y = 2025, m = 5; ; ) {
  MONTHS.push(`${y}-${String(m).padStart(2, "0")}`);
  if (y === 2026 && m === 4) break;
  m++;
  if (m > 12) { m = 1; y++; }
}

const plan = [];
for (const ym of MONTHS) {
  for (const biz of BUSINESSES) {
    const newVal = target.get(`${biz}|${ym}`) ?? 0;
    const r = await findOrCreate(ym, biz);
    const diff = newVal - r.current;
    if (diff !== 0 || r.willCreate || r.created) {
      plan.push({ ym, biz, current: r.current, newVal, diff, pageId: r.id, willCreate: r.willCreate });
    }
  }
}

console.log(`【${APPLY ? "適用" : "ドライラン"}】 月次PL 人件費（バイト代）を更新`);
console.log("-".repeat(80));
console.log("対象月  事業              現Notion     新CSV計算    差分          ");
console.log("-".repeat(80));
for (const p of plan) {
  const flag = p.willCreate ? " [新規作成]" : "";
  console.log(
    `${p.ym}  ${p.biz.padEnd(10, "　")}  ¥${String(p.current).padStart(9)}  ¥${String(p.newVal).padStart(9)}  ${p.diff >= 0 ? "+" : ""}¥${String(p.diff).padStart(9)}${flag}`
  );
}
console.log("-".repeat(80));
console.log(`計 ${plan.length} 件 更新対象`);

if (!APPLY) {
  console.log("\n→ 適用するには `node scripts/update-baito-notion.mjs --apply` を実行");
  process.exit(0);
}

// 実適用
console.log("\n適用中...");
let success = 0, failed = 0;
for (const p of plan) {
  try {
    let pageId = p.pageId;
    if (!pageId) {
      const r = await findOrCreate(p.ym, p.biz);
      pageId = r.id;
    }
    await notion.pages.update({
      page_id: pageId,
      properties: { "人件費（バイト代）": { number: p.newVal } },
    });
    success++;
    console.log(`  ✓ ${p.ym} ${p.biz}: ¥${p.newVal.toLocaleString()}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${p.ym} ${p.biz}: ${e.message}`);
  }
}
console.log(`\n完了: 成功 ${success} / 失敗 ${failed}`);
