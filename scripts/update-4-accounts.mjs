// 4アカウント (xVM/NpJ/cFw/rOY) の日次データを実データで上書き
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";
const DAILY_DS = "ff6be008-cddc-42ef-831f-9b327e056635";

// 各アカウントのシナリオ別日次データ（社内テスト除外済み）
const UPDATES = [
  {
    acc_id: "xVMnVBF3fzuI", label: "1月進研模試対策",
    scenarios: [
      {
        sce_id: "g3avmzDSjP1R", name: "メタ広告",
        daily: {
          "2025-12-21": 1, "2025-12-23": 1, "2025-12-25": 1, "2025-12-29": 1,
          "2025-12-30": 1, "2026-01-01": 1, // 中島・Mika
        }
        // 除外: 2025-12-20 岩本(テスト), 2026-02-11 酒井(社内)
      },
      { sce_id: "LAhTrH0UmAN1", name: "面談予約", daily: {} },
    ],
  },
  {
    acc_id: "NpJjwohj4a8s", label: "2月スタートダッシュ",
    scenarios: [
      {
        sce_id: "qd4OJj4CeUr3", name: "メタ広告",
        daily: {
          "2026-01-25": 2, "2026-01-27": 2, "2026-01-30": 1, "2026-01-31": 1,
          "2026-02-01": 1, "2026-02-02": 1, "2026-02-04": 1, "2026-02-06": 1,
          "2026-02-08": 1, "2026-02-12": 1, "2026-02-14": 1, "2026-01-29": 1, // Mayu Taguchi 1月29
        }
        // 除外: 1/24 岩本, 1/29 酒井(社内)
      },
    ],
  },
  {
    acc_id: "cFwIiZpTXRrQ", label: "浪人生用LINE",
    scenarios: [
      {
        sce_id: "ulFQpnG5bmZd", name: "メタ広告",
        daily: {
          // 2/12 テスト除外
          "2026-02-14": 1, "2026-02-15": 2, "2026-02-16": 2, "2026-02-17": 1,
          "2026-02-18": 3, "2026-02-19": 2, "2026-02-20": 2, "2026-02-21": 2,
          "2026-02-23": 2, "2026-02-24": 2, "2026-02-25": 4, "2026-02-26": 5,
          "2026-02-27": 3, "2026-02-28": 3,
          "2026-03-01": 2, "2026-03-02": 1, "2026-03-04": 2, "2026-03-05": 3,
          "2026-03-06": 2, "2026-03-07": 2, "2026-03-08": 3, "2026-03-09": 6,
          "2026-03-10": 16, "2026-03-11": 4, "2026-03-12": 2, "2026-03-13": 2,
          "2026-03-14": 2, "2026-03-15": 5, "2026-03-16": 2, "2026-03-17": 8,
          "2026-03-18": 4, "2026-03-20": 2, "2026-03-21": 5, "2026-03-22": 2,
          "2026-03-23": 3, "2026-03-25": 1, "2026-03-27": 3, "2026-03-28": 1,
          "2026-03-29": 4, "2026-03-30": 2, "2026-03-31": 1,
          "2026-04-01": 5, "2026-04-02": 2, "2026-04-03": 2, "2026-04-05": 5,
          "2026-04-06": 2, "2026-04-07": 3, "2026-04-08": 1, "2026-04-11": 5,
          "2026-04-12": 1, "2026-04-13": 3, "2026-04-14": 2, "2026-04-15": 1,
          "2026-04-16": 1, "2026-04-18": 2, "2026-04-20": 1, "2026-04-21": 2,
          "2026-04-22": 2,
        }
      },
      {
        sce_id: "PN8ZDb4nbEkJ", name: "面談予約",
        daily: {
          "2026-02-14": 2, "2026-02-15": 2, "2026-02-16": 2, "2026-02-17": 2,
          "2026-02-18": 3, "2026-02-21": 4, "2026-02-23": 1, "2026-02-24": 2,
          "2026-02-25": 3, "2026-02-26": 2, "2026-02-27": 1, "2026-02-28": 1,
          "2026-03-02": 1, "2026-03-03": 1, "2026-03-04": 1, "2026-03-05": 2,
          "2026-03-06": 2, "2026-03-07": 2, "2026-03-08": 6, "2026-03-09": 4,
          "2026-03-10": 3, "2026-03-12": 2, "2026-03-13": 1, "2026-03-16": 1,
          "2026-03-17": 3, "2026-03-18": 3, "2026-03-20": 1, "2026-03-21": 2,
          "2026-03-22": 1, "2026-03-23": 2, "2026-03-25": 2, "2026-03-27": 2,
          "2026-03-29": 1, "2026-03-31": 1,
          "2026-04-01": 2, "2026-04-03": 1, "2026-04-05": 2, "2026-04-06": 1,
          "2026-04-07": 1, "2026-04-09": 2, "2026-04-11": 2, "2026-04-12": 1,
          "2026-04-13": 3, "2026-04-14": 1, "2026-04-18": 1,
        }
      },
    ],
  },
  {
    acc_id: "rOYD8sgrLdAP", label: "春期講習R8",
    scenarios: [
      {
        sce_id: "OwVHe63TSHcj", name: "メタ広告",
        daily: {
          "2026-02-24": 1, "2026-03-01": 2, "2026-03-03": 1, "2026-03-04": 1,
          "2026-03-06": 1, "2026-03-08": 1, "2026-03-11": 1,
        }
      },
      {
        sce_id: "UMV5CiMCCXaO", name: "面談予約",
        daily: {
          "2026-02-26": 1, "2026-03-20": 1,
        }
      },
    ],
  },
];

// マスター page_id 取得
async function getMasterId(accId, sceId) {
  const res = await notion.dataSources.query({
    data_source_id: SOURCE_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: accId } },
      { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
    ]},
    page_size: 1,
  });
  return res.results[0]?.id;
}

// 既存削除
async function deleteScenario(accId, sceId) {
  const res = await notion.dataSources.query({
    data_source_id: DAILY_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: accId } },
      { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
    ]},
    page_size: 100,
  });
  for (const p of res.results) {
    await notion.pages.update({ page_id: p.id, archived: true });
  }
  return res.results.length;
}

// 実行
for (const acc of UPDATES) {
  console.log(`\n=== ${acc.label} (${acc.acc_id}) ===`);
  for (const s of acc.scenarios) {
    const masterId = await getMasterId(acc.acc_id, s.sce_id);
    if (!masterId) { console.log(`  ! マスター未登録: ${s.sce_id} (${s.name})`); continue; }
    const deleted = await deleteScenario(acc.acc_id, s.sce_id);
    console.log(`  [${s.name}] 旧削除: ${deleted}件`);
    let created = 0;
    for (const [date, count] of Object.entries(s.daily)) {
      await notion.pages.create({
        parent: { data_source_id: DAILY_DS },
        properties: {
          "名前": { title: [{ text: { content: `${date} ${acc.label}/${s.name}` } }] },
          "日付": { date: { start: date } },
          "流入経路": { relation: [{ id: masterId }] },
          "新規読者数": { number: count },
          "UTAGEアカウントID": { rich_text: [{ text: { content: acc.acc_id } }] },
          "UTAGEシナリオID": { rich_text: [{ text: { content: s.sce_id } }] },
        },
      });
      created++;
    }
    const total = Object.values(s.daily).reduce((a, b) => a + b, 0);
    console.log(`  [${s.name}] 新規追加: ${created}日 / 合計${total}件`);
  }
}
console.log("\n完了");
