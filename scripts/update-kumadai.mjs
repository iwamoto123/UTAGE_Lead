// 熊大超特化塾(7qQJ38rzLtbM)の日次リード数を実データで上書き
// 月別アグリゲート → 日別の正確な値に差し替え
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

const ACC_ID = "7qQJ38rzLtbM";

// メタ広告 XAz7XmBFO3yX - 11件 (実データ)
const META_DAILY = {
  "2026-05-09": 1, "2026-05-10": 1, "2026-05-11": 1, "2026-05-12": 1, "2026-05-13": 1,
  "2026-05-18": 2, "2026-05-19": 1, "2026-05-20": 1, "2026-05-21": 1, "2026-05-26": 1,
};

// 面談予約 OQu9St8wqN9R - 1件 (北崎由真)
const RESERVATION_DAILY = {
  "2026-05-19": 1,
};

// 1) マスターの page_id を取得
async function getMasterId(sceId) {
  const res = await notion.dataSources.query({
    data_source_id: SOURCE_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: ACC_ID } },
      { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
    ]},
    page_size: 1,
  });
  return res.results[0]?.id;
}

const metaMasterId = await getMasterId("XAz7XmBFO3yX");
const resMasterId = await getMasterId("OQu9St8wqN9R");
console.log(`メタ広告 master: ${metaMasterId}`);
console.log(`面談予約 master: ${resMasterId}`);

// 2) 既存の 熊大超特化塾 関連の日次レコードを全て取得して削除
async function deleteScenario(sceId) {
  const res = await notion.dataSources.query({
    data_source_id: DAILY_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: ACC_ID } },
      { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
    ]},
    page_size: 100,
  });
  for (const p of res.results) {
    await notion.pages.update({ page_id: p.id, archived: true });
    console.log(`  - 削除: ${p.properties["日付"]?.date?.start} ${p.properties["新規読者数"]?.number}`);
  }
}

console.log("\n旧データを削除...");
await deleteScenario("XAz7XmBFO3yX");
await deleteScenario("OQu9St8wqN9R");

// 3) 新規追加
console.log("\n新規追加 (メタ広告)...");
for (const [date, count] of Object.entries(META_DAILY)) {
  await notion.pages.create({
    parent: { data_source_id: DAILY_DS },
    properties: {
      "名前": { title: [{ text: { content: `${date} 熊大メタ広告` } }] },
      "日付": { date: { start: date } },
      "流入経路": { relation: [{ id: metaMasterId }] },
      "新規読者数": { number: count },
      "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: "XAz7XmBFO3yX" } }] },
    },
  });
  console.log(`  + ${date}: ${count}`);
}

console.log("\n新規追加 (面談予約)...");
for (const [date, count] of Object.entries(RESERVATION_DAILY)) {
  await notion.pages.create({
    parent: { data_source_id: DAILY_DS },
    properties: {
      "名前": { title: [{ text: { content: `${date} 熊大面談予約` } }] },
      "日付": { date: { start: date } },
      "流入経路": { relation: [{ id: resMasterId }] },
      "新規読者数": { number: count },
      "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: "OQu9St8wqN9R" } }] },
    },
  });
  console.log(`  + ${date}: ${count}`);
}

console.log(`\n完了: メタ広告${Object.values(META_DAILY).reduce((a, b) => a + b, 0)}件 / 面談予約${Object.values(RESERVATION_DAILY).reduce((a, b) => a + b, 0)}件`);
