// 2026-07-22 UTAGE 新規リード同期
// 他アカウント (PjocL14v2u6j / 7qQJ38rzLtbM / Tm32etw7epfS / n99EYdMfgwxy) は
// UTAGE 側の最新 base_date が Notion cutoff と同じで新規0件。
// TZq4ob5n4GZ1 通年シナリオのみ 3件 (7/19 HP_BLOG,META_REUSE / 7/21 YT_VIDEO) を upsert。
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

const LABELS = {
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "地方医学部/YouTube動画",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG":  "地方医学部/HPブログ",
  "TZq4ob5n4GZ1|TZq4_META_REUSE": "地方医学部/メタ広告(合流)再受験",
};

const AGG = {
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO":  { "2026-07-21": 1 },
  "TZq4ob5n4GZ1|TZq4_HP_BLOG":   { "2026-07-19": 1 },
  "TZq4ob5n4GZ1|TZq4_META_REUSE":{ "2026-07-19": 1 },
};

async function loadMasters() {
  const map = new Map();
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: SOURCE_DS, start_cursor: cursor, page_size: 100 });
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
    const res = await notion.dataSources.query({ data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100 });
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
for (const [key, daily] of Object.entries(AGG)) {
  const [acc, sce] = key.split("|");
  const label = LABELS[key] ?? key;
  const masterId = masters.get(key);
  if (!masterId) { console.log(`! マスター未登録: ${label} (${key})`); skipped++; continue; }

  for (const [date, count] of Object.entries(daily)) {
    const ekey = `${date}|${acc}|${sce}`;
    const props = {
      "名前": { title: [{ text: { content: `${date} ${label}` } }] },
      "日付": { date: { start: date } },
      "流入経路": { relation: [{ id: masterId }] },
      "新規読者数": { number: count },
      "UTAGEアカウントID": { rich_text: [{ text: { content: acc } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: sce } }] },
    };
    if (existing.has(ekey)) {
      await notion.pages.update({ page_id: existing.get(ekey), properties: props });
      updated++;
      console.log(`  ~ ${date} ${label}: ${count}`);
    } else {
      await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
      created++;
      console.log(`  + ${date} ${label}: ${count}`);
    }
  }
}

console.log(`\n新規${created} / 更新${updated} / スキップ${skipped}`);
