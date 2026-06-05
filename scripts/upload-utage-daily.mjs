// scripts/utage-aggregated.json を Notion UTAGE日次リード数 DB に upsert
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DAILY_DS = "ff6be008-cddc-42ef-831f-9b327e056635";
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";

// 流入経路マスターから (account_id, scenario_id) → master_page_id
const sourceMap = new Map();
{
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: SOURCE_DS, start_cursor: cursor, page_size: 100,
    });
    for (const p of res.results) {
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      const cat = p.properties["経路カテゴリ"]?.select?.name ?? "";
      sourceMap.set(`${a}|${s}`, { id: p.id, category: cat });
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

// 既存日次レコードを (date, account_id, scenario_id) → page_id でロード
const existing = new Map();
{
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100,
    });
    for (const p of res.results) {
      const d = p.properties["日付"]?.date?.start ?? "";
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      existing.set(`${d}|${a}|${s}`, p.id);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

const data = JSON.parse(fs.readFileSync("scripts/utage-aggregated.json", "utf8"));
let created = 0, updated = 0, skipped = 0;

for (const r of data.scenario_daily) {
  // シナリオ単位レコード優先、無ければアカウントレベル(scenario_id 空)を参照
  let src = sourceMap.get(`${r.account_id}|${r.scenario_id}`);
  if (!src) src = sourceMap.get(`${r.account_id}|`);
  if (!src) {
    console.log(`! マスター未登録: ${r.account_id}/${r.scenario_id}`);
    skipped++; continue;
  }
  const key = `${r.date}|${r.account_id}|${r.scenario_id}`;
  const props = {
    "名前": { title: [{ text: { content: `${r.date} ${r.account_id}/${r.scenario_id || "(account)"}` } }] },
    "日付": { date: { start: r.date } },
    "流入経路": { relation: [{ id: src.id }] },
    "新規読者数": { number: r.count },
    "UTAGEアカウントID": { rich_text: [{ text: { content: r.account_id } }] },
    "UTAGEシナリオID": { rich_text: [{ text: { content: r.scenario_id || "" } }] },
  };
  if (existing.has(key)) {
    await notion.pages.update({ page_id: existing.get(key), properties: props });
    updated++;
  } else {
    await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
    created++;
  }
}

console.log(`完了: 新規 ${created} / 更新 ${updated} / スキップ ${skipped}`);
