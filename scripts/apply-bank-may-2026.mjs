// 5月銀行口座データを 月次PL 2026-05 に反映
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
const TARGET = "2026-05-01";
const LOG = "2026-06-06 銀行口座5月データ反映 (nmr20260605)";

// 投入内容 (各事業の差分追加)
const UPDATES = [
  {
    bizId: R8_MIYAZAKI,
    label: "宮崎教室",
    add: {
      "業務委託費": 121000,        // アテナ¥68,000 + LP作成(イシザワ)¥53,000
      "地代家賃": 53330,           // DF.アルファー
      "水道光熱費": 12769,          // ガス¥7,775 + 水道¥4,994
      "通信費": 130,               // CATV¥4,730 vs 既存¥4,600 → +¥130
      "支払手数料": 12980,          // 振込手数料 計11件
      "法人間移動": 1500000,       // 株白谷塾¥500,000 + 株武士道 岩本¥1,000,000
    },
  },
  {
    bizId: R8_ONLINE,
    label: "白谷塾オンライン",
    add: {
      "業務委託費": 13600,         // インタビュー出演料 ｷﾞﾏ¥3,000 + ｼﾐｽﾞ¥3,000 + ﾔﾏﾀﾞ¥5,000 + ﾅｶﾑﾗ¥2,600
      "その他売上": 12181,         // Google AdSense
    },
  },
];

async function findPage(bizId) {
  const res = await notion.dataSources.query({
    data_source_id: DS_ID,
    filter: { and: [
      { property: "対象月", date: { equals: TARGET } },
      { property: "事業-年度", relation: { contains: bizId } },
    ]},
    page_size: 1,
  });
  return res.results[0];
}

console.log(`=== 銀行データ 2026-05 反映 ===\n`);

for (const u of UPDATES) {
  const page = await findPage(u.bizId);
  if (!page) { console.log(`! ${u.label}: レコードなし`); continue; }
  console.log(`■ ${u.label}`);
  const props = {};
  for (const [key, addAmt] of Object.entries(u.add)) {
    const existing = page.properties[key]?.number ?? 0;
    const next = existing + addAmt;
    props[key] = { number: next };
    console.log(`  ${key.padEnd(10)} ¥${existing.toLocaleString()} + ¥${addAmt.toLocaleString()} = ¥${next.toLocaleString()}`);
  }
  const prevLog = page.properties["アップロード履歴"]?.rich_text?.map(t => t.plain_text).join("") ?? "";
  props["アップロード履歴"] = { rich_text: [{ text: { content: prevLog ? `${prevLog}\n${LOG}` : LOG } }] };
  await notion.pages.update({ page_id: page.id, properties: props });
  console.log();
}

console.log("完了");
