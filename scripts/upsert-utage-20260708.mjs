// 2026-07-08 UTAGE 新規リードを Notion 日次リード数DB に upsert
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
  "PjocL14v2u6j|yyog9fvedOtP": "再受験/メタ広告",
  "PjocL14v2u6j|V98BSMwhViZC": "再受験/面談予約",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "再受験/YouTube",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "熊大特化/メタ広告",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "熊大特化/面談予約",
  "Tm32etw7epfS|fpZvVLcMvLMK": "九州高1高2/メタ広告",
  "Tm32etw7epfS|NidcrIoR9Aqi": "九州高1高2/面談予約",
  "n99EYdMfgwxy|VJHxg3hQn8qy": "総体後/メタ広告",
  "n99EYdMfgwxy|zZe1kylB5Nfr": "総体後/面談予約",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "地方医学部/YouTube動画",
  "TZq4ob5n4GZ1|TZq4_YT_DESC": "地方医学部/YouTube概要欄",
  "TZq4ob5n4GZ1|TZq4_YT_POST": "地方医学部/YouTube投稿",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS": "地方医学部/Threads",
  "TZq4ob5n4GZ1|TZq4_SNS_X": "地方医学部/X",
  "TZq4ob5n4GZ1|TZq4_SNS_IG": "地方医学部/Instagram",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK": "地方医学部/TikTok",
  "TZq4ob5n4GZ1|TZq4_STANDFM": "地方医学部/SNS StandFM",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "地方医学部/HPブログ",
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE": "地方医学部/HP UTAGE",
  "TZq4ob5n4GZ1|TZq4_META_REUSE": "地方医学部/メタ広告(合流)再受験",
  "TZq4ob5n4GZ1|TZq4_META_K12": "地方医学部/メタ広告(合流)高1高2",
  "TZq4ob5n4GZ1|TZq4_UNK": "地方医学部/トラッキング無し",
};

// Notion 最新日付 (check-notion-utage-per-scenario.mjs 実行結果 2026-07-08)
const LATEST = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-07-06",
  "PjocL14v2u6j|V98BSMwhViZC": "2026-07-03",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "2026-07-07",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "2026-06-10",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "2026-05-19",
  "Tm32etw7epfS|fpZvVLcMvLMK": "2026-06-13",
  "Tm32etw7epfS|NidcrIoR9Aqi": "2026-05-26",
  "n99EYdMfgwxy|VJHxg3hQn8qy": "2026-06-13",
  "n99EYdMfgwxy|zZe1kylB5Nfr": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "2026-06-27",
  "TZq4ob5n4GZ1|TZq4_YT_DESC": "2026-02-24",
  "TZq4ob5n4GZ1|TZq4_YT_POST": "2026-04-30",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS": "2025-11-06",
  "TZq4ob5n4GZ1|TZq4_SNS_X": "2026-01-11",
  "TZq4ob5n4GZ1|TZq4_SNS_IG": "2026-05-03",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK": "2025-09-03",
  "TZq4ob5n4GZ1|TZq4_STANDFM": "2026-06-07",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "2026-07-04",
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE": "2026-07-05",
  "TZq4ob5n4GZ1|TZq4_META_REUSE": "2026-06-29",
  "TZq4ob5n4GZ1|TZq4_META_K12": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_UNK": "2026-06-07",
};

const TODAY = "2026-07-08";

// ============================================================
// 抽出結果 (mcp__claude_ai_UTAGE__message_reader_list_all で取得)
// base_date >= LATEST[key] を包含
// ============================================================
const AGG = {
  "PjocL14v2u6j|yyog9fvedOtP": { "2026-07-07": 1, "2026-07-06": 2 },
  "PjocL14v2u6j|V98BSMwhViZC": { "2026-07-03": 1 },
  "PjocL14v2u6j|ss0Y2tqzi9hW": { "2026-07-07": 1 },
  "7qQJ38rzLtbM|XAz7XmBFO3yX": { "2026-06-10": 1 },
  "7qQJ38rzLtbM|OQu9St8wqN9R": { "2026-05-19": 1 },
  "Tm32etw7epfS|fpZvVLcMvLMK": { "2026-06-13": 1 },
  "Tm32etw7epfS|NidcrIoR9Aqi": { "2026-05-26": 1 },
  // VJHxg3hQn8qy: message_tracking_name "メインの公式LINEから" は集計外
  "n99EYdMfgwxy|VJHxg3hQn8qy": { "2026-06-13": 2 },
  "n99EYdMfgwxy|zZe1kylB5Nfr": { "2026-06-13": 1 },
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": { "2026-07-07": 1, "2026-06-27": 1 },
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE": { "2026-07-05": 1 },
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": { "2026-07-04": 1 },
  "TZq4ob5n4GZ1|TZq4_META_REUSE": { "2026-06-29": 1 },
  "TZq4ob5n4GZ1|TZq4_META_K12": { "2026-06-13": 1 },
  "TZq4ob5n4GZ1|TZq4_STANDFM": { "2026-06-07": 1 },
};

const filtered = {};
for (const [key, daily] of Object.entries(AGG)) {
  const latest = LATEST[key];
  const f = {};
  for (const [date, cnt] of Object.entries(daily)) {
    if (date > TODAY) continue;
    if (date >= latest) f[date] = cnt;
  }
  if (Object.keys(f).length > 0) filtered[key] = f;
}

console.log("=== 各 (acc|sce) の latest以降 ===");
for (const [key, daily] of Object.entries(filtered)) {
  console.log(`  ${key.padEnd(40)} latest=${LATEST[key]}:`, daily);
}

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
console.log(`\n流入経路マスター: ${masters.size}件 / 既存日次: ${existing.size}件\n`);

let created = 0, updated = 0, skipped = 0, noop = 0;
for (const [key, daily] of Object.entries(filtered)) {
  const [acc, sce] = key.split("|");
  const label = LABELS[key] ?? key;
  const masterId = masters.get(key);
  if (!masterId) { console.log(`! マスター未登録: ${label} (${key})`); skipped++; continue; }

  for (const [date, count] of Object.entries(daily)) {
    const ek = `${date}|${acc}|${sce}`;
    const props = {
      "名前": { title: [{ text: { content: `${date} ${label}` } }] },
      "日付": { date: { start: date } },
      "流入経路": { relation: [{ id: masterId }] },
      "新規読者数": { number: count },
      "UTAGEアカウントID": { rich_text: [{ text: { content: acc } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: sce } }] },
    };
    const ex = existing.get(ek);
    if (ex) {
      if (ex.count === count) {
        console.log(`= no-op: ${date} ${label} (count=${count})`);
        noop++;
      } else {
        await notion.pages.update({ page_id: ex.id, properties: props });
        console.log(`↑ updated: ${date} ${label} ${ex.count}→${count}`);
        updated++;
      }
    } else {
      await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
      console.log(`+ created: ${date} ${label} =${count}`);
      created++;
    }
  }
}

console.log(`\n結果: 新規=${created} / 更新=${updated} / no-op=${noop} / skipped=${skipped}`);
