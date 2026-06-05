// TZq4ob5n4GZ1 (地方医学部オンライン塾 ローカルメディ) の通年シナリオ194名を
// message_tracking_name で 12 個の仮想シナリオに分割して投入
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
const R8_LOCALMEDI = "335882582d8c81ce8737dbf973eca362";

const ACC_ID = "TZq4ob5n4GZ1";
const ACC_NAME = "地方医学部オンライン塾 ローカルメディ";

const classified = JSON.parse(fs.readFileSync("scripts/tzq4-classified.json", "utf8"));

async function findMaster(accId, sceId) {
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

async function ensureMaster(sceId, sceName, category) {
  let id = await findMaster(ACC_ID, sceId);
  if (id) {
    console.log(`= 既存: ${sceName}`);
    return id;
  }
  const res = await notion.pages.create({
    parent: { data_source_id: SOURCE_DS },
    properties: {
      "名前": { title: [{ text: { content: `${ACC_NAME} / ${sceName}` } }] },
      "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
      "UTAGEアカウント名": { rich_text: [{ text: { content: ACC_NAME } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: sceId } }] },
      "UTAGEシナリオ名": { rich_text: [{ text: { content: sceName } }] },
      "経路カテゴリ": { select: { name: category } },
      "事業-年度": { relation: [{ id: R8_LOCALMEDI }] },
      "集計対象": { checkbox: true },
      "備考": { rich_text: [{ text: { content: "通年シナリオ(9lF9qbjgG5a8)を message_tracking_name で仮想分割" } }] },
    },
  });
  console.log(`+ 新規: ${sceName}`);
  return res.id;
}

async function deleteScenarioDaily(accId, sceId) {
  const res = await notion.dataSources.query({
    data_source_id: DAILY_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: accId } },
      { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
    ]},
    page_size: 100,
  });
  for (const p of res.results) await notion.pages.update({ page_id: p.id, archived: true });
  return res.results.length;
}

console.log(`=== ${ACC_NAME} (${ACC_ID}) ===\n`);
console.log("通年シナリオ194名を仮想シナリオに分割\n");

for (const s of classified.scenarios) {
  const masterId = await ensureMaster(s.virt_scenario_id, s.virt_scenario_name, s.category);
  const deleted = await deleteScenarioDaily(ACC_ID, s.virt_scenario_id);
  if (deleted > 0) console.log(`  旧削除: ${deleted}件`);
  let created = 0;
  for (const [date, count] of Object.entries(s.daily)) {
    await notion.pages.create({
      parent: { data_source_id: DAILY_DS },
      properties: {
        "名前": { title: [{ text: { content: `${date} 地方医学部/${s.virt_scenario_name}` } }] },
        "日付": { date: { start: date } },
        "流入経路": { relation: [{ id: masterId }] },
        "新規読者数": { number: count },
        "UTAGEアカウントID": { rich_text: [{ text: { content: ACC_ID } }] },
        "UTAGEシナリオID": { rich_text: [{ text: { content: s.virt_scenario_id } }] },
      },
    });
    created++;
  }
  console.log(`  ${s.category} / ${s.virt_scenario_name}: ${created}日 / 合計${s.total}件`);
}
console.log("\n完了");
