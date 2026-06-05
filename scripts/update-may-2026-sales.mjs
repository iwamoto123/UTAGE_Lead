// 月次PL DB: 2026-05 売上を投入
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";

const R8_MIYAZAKI  = "33588258-2d8c-8172-a026-f20baacea13a";
const R8_ONLINE    = "33588258-2d8c-8160-ac00-d9a18a0238ed";
const R8_LOCALMEDI = "33588258-2d8c-81ce-8737-dbf973eca362";

const TARGET_MONTH = "2026-05-01";
const UPLOAD_LOG = `2026-06-02 5月売上CSV取込 (件数 宮崎71/オンライン13/ローカル5)`;

const UPDATES = [
  {
    bizId: R8_MIYAZAKI,
    label: "宮崎教室",
    sales: 1541400,
    students: 71,
    hs1: 19, hs2: 16, hs3: 36,
  },
  {
    bizId: R8_ONLINE,
    label: "白谷塾オンライン教室",
    sales: 804800,
    students: 13,
  },
  {
    bizId: R8_LOCALMEDI,
    label: "ローカルメディ",
    sales: 387400,
    students: 5,
  },
];

// 既存ページを bizId × 対象月 で検索
async function findPage(bizId) {
  const res = await notion.dataSources.query({
    data_source_id: DS_ID,
    filter: {
      and: [
        { property: "対象月", date: { equals: TARGET_MONTH } },
        { property: "事業-年度", relation: { contains: bizId } },
      ],
    },
    page_size: 1,
  });
  return res.results[0]?.id;
}

console.log(`=== 2026-05 月次PL 売上投入 ===\n`);

for (const u of UPDATES) {
  const pageId = await findPage(u.bizId);
  if (!pageId) {
    console.log(`! ${u.label}: 該当レコードなし (要新規作成)`);
    continue;
  }
  const props = {
    "売上": { number: u.sales },
    "生徒数": { number: u.students },
    "アップロード履歴": { rich_text: [{ text: { content: UPLOAD_LOG } }] },
    "データなし免除": { checkbox: false },
  };
  if (u.hs1 !== undefined) props["高1人数"] = { number: u.hs1 };
  if (u.hs2 !== undefined) props["高2人数"] = { number: u.hs2 };
  if (u.hs3 !== undefined) props["高3人数"] = { number: u.hs3 };

  await notion.pages.update({ page_id: pageId, properties: props });
  console.log(`+ ${u.label.padEnd(20)} 売上 ¥${u.sales.toLocaleString()}  生徒${u.students}名`);
}

console.log("\n完了");
