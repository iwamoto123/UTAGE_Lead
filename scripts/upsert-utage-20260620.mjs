// 2026-06-20 UTAGE 新規リードを Notion 日次リード数DB に upsert
// (各 (acc|sce) の Notion 最新日付より新しいレコードのみ反映)
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
    acc: "PjocL14v2u6j", sce: "yyog9fvedOtP", label: "再受験/メタ広告",
    daily: { "2026-06-16": 3 },
  },
  {
    acc: "PjocL14v2u6j", sce: "V98BSMwhViZC", label: "再受験/面談予約",
    daily: { "2026-06-16": 2 },
  },
  {
    acc: "TZq4ob5n4GZ1", sce: "TZq4_HP_BLOG", label: "地方医学部/HPブログ",
    daily: { "2026-06-15": 1 },
  },
  {
    acc: "TZq4ob5n4GZ1", sce: "TZq4_META_REUSE", label: "地方医学部/メタ広告(合流)再受験",
    daily: { "2026-06-16": 2, "2026-06-19": 1 },
  },
];

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
      const n = p.properties["新規読者数"]?.number ?? 0;
      map.set(`${d}|${a}|${s}`, { id: p.id, count: n });
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return map;
}

const masters = await loadMasters();
const existing = await loadExisting();
console.log(`流入経路マスター: ${masters.size}件 / 既存日次: ${existing.size}件\n`);

let created = 0, updated = 0, skipped = 0, noop = 0;
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
    const ex = existing.get(key);
    if (ex) {
      if (ex.count === count) {
        console.log(`= no-op: ${date} ${e.label} (count=${count})`);
        noop++;
      } else {
        await notion.pages.update({ page_id: ex.id, properties: props });
        console.log(`↑ updated: ${date} ${e.label} ${ex.count}→${count}`);
        updated++;
      }
    } else {
      await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
      console.log(`+ created: ${date} ${e.label} =${count}`);
      created++;
    }
  }
}

console.log(`\n結果: 新規=${created} / 更新=${updated} / no-op=${noop} / skipped=${skipped}`);
