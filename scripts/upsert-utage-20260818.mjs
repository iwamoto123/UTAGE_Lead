// 2026-08-18 UTAGE 新規リーダー同期 → Notion 日次リード数DB
// base_date > per-scenario Notion 最新日付 のレコードのみ upsert
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

const ENTRIES = [
  {
    acc: "TZq4ob5n4GZ1", sce: "TZq4_HP_BLOG", label: "地方医学部/HPブログ",
    daily: { "2026-08-16": 1 },
  },
  {
    acc: "TZq4ob5n4GZ1", sce: "TZq4_YT_VIDEO", label: "地方医学部/YouTube動画",
    daily: { "2026-08-18": 1 },
  },
];

async function retry(fn, maxRetries = 12) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === maxRetries - 1) throw e;
      const wait = 2000 * (i + 1);
      console.error(`  retry ${i+1}: ${e.message || e.code} - waiting ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

async function loadMasters() {
  const map = new Map();
  let cursor;
  do {
    const res = await retry(() => notion.dataSources.query({ data_source_id: SOURCE_DS, start_cursor: cursor, page_size: 100 }));
    for (const p of res.results) {
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      map.set(`${a}|${s}`, p.id);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return map;
}

async function loadExisting() {
  const map = new Map();
  let cursor;
  do {
    const res = await retry(() => notion.dataSources.query({ data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100 }));
    for (const p of res.results) {
      const d = p.properties["日付"]?.date?.start ?? "";
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      map.set(`${d}|${a}|${s}`, p.id);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return map;
}

const masters = await loadMasters();
const existing = await loadExisting();
console.log(`流入経路マスター: ${masters.size}件 / 既存日次: ${existing.size}件\n`);

let created = 0, updated = 0, skipped = 0;
for (const e of ENTRIES) {
  const masterId = masters.get(`${e.acc}|${e.sce}`);
  if (!masterId) { console.log(`! マスター未登録: ${e.label} (${e.acc}|${e.sce})`); skipped++; continue; }

  for (const [date, count] of Object.entries(e.daily)) {
    const key = `${date}|${e.acc}|${e.sce}`;
    const props = {
      "名前": { title: [{ text: { content: `${date} ${e.label}` } }] },
      "日付": { date: { start: date } },
      "流入経路": { relation: [{ id: masterId }] },
      "新規読者数": { number: count },
      "UTAGEアカウントID": { rich_text: [{ text: { content: e.acc } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: e.sce } }] },
    };
    if (existing.has(key)) {
      await retry(() => notion.pages.update({ page_id: existing.get(key), properties: props }));
      updated++;
      console.log(`  ~ ${date} ${e.label}: ${count}`);
    } else {
      await retry(() => notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props }));
      created++;
      console.log(`  + ${date} ${e.label}: ${count}`);
    }
  }
}

console.log(`\n新規${created} / 更新${updated} / スキップ${skipped}`);
