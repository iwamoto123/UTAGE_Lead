// UTAGE 新規リーダーを Notion 日次リード数DB に upsert (2026-07-19 実行)
// 対象: PjocL14v2u6j / 7qQJ38rzLtbM / Tm32etw7epfS / TZq4ob5n4GZ1 / n99EYdMfgwxy
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

// ---- 手動貼付リーダーデータ (parallel MCP呼び出しの結果) ----
// 形式: { acc, sce, records: [{base_date, mtn}] }
const INLINE = [
  {
    acc: "PjocL14v2u6j", sce: "V98BSMwhViZC", label: "再受験/面談予約",
    records: [
      { base_date: "2026-07-16 10:58:52", mtn: null },
      { base_date: "2026-07-15 18:29:34", mtn: null },
      { base_date: "2026-07-03 06:38:50", mtn: null },
      { base_date: "2026-06-29 00:13:49", mtn: null },
      { base_date: "2026-06-28 22:11:25", mtn: null },
      { base_date: "2026-06-20 10:02:55", mtn: null },
      { base_date: "2026-06-16 22:48:23", mtn: null },
      { base_date: "2026-06-16 17:15:08", mtn: null },
      { base_date: "2026-06-14 00:50:46", mtn: null },
      { base_date: "2026-06-13 22:33:33", mtn: null },
      { base_date: "2026-06-13 21:12:39", mtn: null },
      { base_date: "2026-06-13 18:22:28", mtn: null },
      { base_date: "2026-06-12 05:43:51", mtn: null },
      { base_date: "2026-06-09 19:38:57", mtn: null },
      { base_date: "2026-06-08 15:18:15", mtn: null },
      { base_date: "2026-06-07 23:25:14", mtn: null },
      { base_date: "2026-06-05 13:20:43", mtn: null },
      { base_date: "2026-06-04 21:36:58", mtn: null },
      { base_date: "2026-06-03 16:54:53", mtn: null },
      { base_date: "2026-05-30 21:07:55", mtn: null },
      { base_date: "2026-05-27 22:31:19", mtn: null },
      { base_date: "2026-05-24 23:38:47", mtn: null },
      { base_date: "2026-05-22 11:16:48", mtn: null },
      { base_date: "2026-05-18 22:00:54", mtn: null },
      { base_date: "2026-05-18 19:40:49", mtn: null },
      { base_date: "2026-05-12 23:56:53", mtn: null },
      { base_date: "2026-05-09 12:55:45", mtn: null },
      { base_date: "2026-05-07 00:36:01", mtn: null },
      { base_date: "2026-05-05 15:35:09", mtn: null },
      { base_date: "2026-05-04 18:19:12", mtn: null },
      { base_date: "2026-05-02 15:39:49", mtn: null },
      { base_date: "2026-05-01 16:42:10", mtn: null },
      { base_date: "2026-04-24 03:33:11", mtn: null },
      { base_date: "2026-04-23 08:26:28", mtn: null },
      { base_date: "2026-04-22 21:20:54", mtn: null },
      { base_date: "2026-04-22 20:21:42", mtn: null },
      { base_date: "2026-04-21 21:08:43", mtn: null },
      { base_date: "2026-04-20 21:11:08", mtn: null },
      { base_date: "2026-04-20 20:20:32", mtn: null },
      { base_date: "2026-04-20 01:16:53", mtn: null },
      { base_date: "2026-04-18 10:37:19", mtn: null },
      { base_date: "2026-04-17 00:52:30", mtn: null },
      { base_date: "2026-04-16 02:04:03", mtn: null },
      { base_date: "2026-04-14 01:43:50", mtn: null },
      { base_date: "2026-04-12 20:53:56", mtn: null },
      { base_date: "2026-04-12 10:31:23", mtn: null },
    ],
  },
  {
    acc: "PjocL14v2u6j", sce: "ss0Y2tqzi9hW", label: "再受験/YouTube",
    records: [
      { base_date: "2026-07-07 11:15:11", mtn: "yt" },
      { base_date: "2026-06-28 21:55:56", mtn: "yt" },
      { base_date: "2026-06-08 19:33:56", mtn: "yt" },
      { base_date: "2026-05-26 01:32:33", mtn: "yt" },
      { base_date: "2026-05-18 17:40:53", mtn: "yt" },
      { base_date: "2026-05-17 22:45:33", mtn: "yt" },
      { base_date: "2026-05-12 09:47:35", mtn: "yt" },
    ],
  },
  {
    acc: "7qQJ38rzLtbM", sce: "XAz7XmBFO3yX", label: "熊大特化/メタ広告",
    records: [
      { base_date: "2026-06-10 18:12:45", mtn: null },
      { base_date: "2026-06-09 15:04:05", mtn: null },
      { base_date: "2026-06-05 09:57:02", mtn: null },
      { base_date: "2026-06-04 14:37:07", mtn: null },
      { base_date: "2026-06-04 06:41:08", mtn: null },
      { base_date: "2026-06-02 22:52:25", mtn: null },
      { base_date: "2026-05-26 23:19:23", mtn: null },
      { base_date: "2026-05-21 18:54:34", mtn: null },
      { base_date: "2026-05-20 07:30:37", mtn: null },
      { base_date: "2026-05-19 00:14:59", mtn: null },
      { base_date: "2026-05-18 23:35:31", mtn: null },
      { base_date: "2026-05-18 18:29:13", mtn: null },
      { base_date: "2026-05-13 02:15:17", mtn: null },
      { base_date: "2026-05-12 07:08:46", mtn: null },
      { base_date: "2026-05-11 14:11:52", mtn: null },
      { base_date: "2026-05-10 10:38:07", mtn: null },
      { base_date: "2026-05-09 15:26:18", mtn: null },
    ],
  },
  {
    acc: "7qQJ38rzLtbM", sce: "OQu9St8wqN9R", label: "熊大特化/面談予約",
    records: [
      { base_date: "2026-05-19 21:03:36", mtn: null },
    ],
  },
  {
    acc: "Tm32etw7epfS", sce: "fpZvVLcMvLMK", label: "九州高1高2/メタ広告",
    records: [
      { base_date: "2026-06-13 00:13:35", mtn: null },
      { base_date: "2026-05-28 21:54:41", mtn: null },
      { base_date: "2026-05-24 18:34:01", mtn: null },
      { base_date: "2026-05-21 18:51:43", mtn: null },
      { base_date: "2026-05-21 18:24:36", mtn: null },
      { base_date: "2026-05-19 16:57:36", mtn: null },
      { base_date: "2026-05-19 12:39:46", mtn: null },
      { base_date: "2026-05-19 09:43:20", mtn: null },
    ],
  },
  {
    acc: "Tm32etw7epfS", sce: "NidcrIoR9Aqi", label: "九州高1高2/面談予約",
    records: [
      { base_date: "2026-05-26 20:16:08", mtn: null },
      { base_date: "2026-05-19 09:47:26", mtn: null },
    ],
  },
  {
    acc: "n99EYdMfgwxy", sce: "VJHxg3hQn8qy", label: "総体後Zoom/メタ広告",
    // "メインの公式LINEから" は集計外
    records: [
      { base_date: "2026-06-13 16:14:35", mtn: null },
      { base_date: "2026-06-13 07:58:29", mtn: null },
      { base_date: "2026-06-12 14:23:13", mtn: null },
      { base_date: "2026-06-08 19:03:30", mtn: null },
      { base_date: "2026-06-08 10:24:09", mtn: "メインの公式LINEから" },
      { base_date: "2026-06-07 23:10:52", mtn: "メインの公式LINEから" },
      { base_date: "2026-06-07 22:12:52", mtn: "メインの公式LINEから" },
      { base_date: "2026-06-07 21:17:41", mtn: null },
      { base_date: "2026-06-07 21:16:59", mtn: "メインの公式LINEから" },
      { base_date: "2026-06-07 21:10:13", mtn: null },
      { base_date: "2026-06-07 20:56:38", mtn: null },
      { base_date: "2026-06-07 20:48:33", mtn: null },
      { base_date: "2026-06-07 20:46:47", mtn: null },
    ],
  },
  {
    acc: "n99EYdMfgwxy", sce: "zZe1kylB5Nfr", label: "総体後Zoom/面談予約",
    records: [
      { base_date: "2026-06-13 16:40:10", mtn: null },
      { base_date: "2026-06-08 19:08:32", mtn: null },
      { base_date: "2026-06-07 21:21:21", mtn: null },
    ],
  },
];

// ---- ファイル読み込み (大量データ) ----
function readJsonl(path) {
  return fs.readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}
// yyog9fvedOtP page1: 100 records (page2 は 2026-04月台のみで対象外)
const yyogP1 = readJsonl("/tmp/utage-sync/yyog_p1.jsonl");
INLINE.push({
  acc: "PjocL14v2u6j", sce: "yyog9fvedOtP", label: "再受験/メタ広告",
  records: yyogP1.map(r => ({ base_date: r.base_date, mtn: r.mtn })),
});

// TZq4 通年シナリオ page1 + page2 (page3 は 2025年で対象外)
const tzq4P1 = readJsonl("/tmp/utage-sync/tzq4_p1.jsonl");
const tzq4P2 = readJsonl("/tmp/utage-sync/tzq4_p2.jsonl");
const tzq4All = [...tzq4P1, ...tzq4P2];

// TZq4 分類関数
function classifyTZq4(mtn) {
  if (!mtn) return "TZq4_UNK";
  if (mtn === "Threadsプロフィールから") return "TZq4_SNS_THREADS";
  if (mtn === "Xプロフィールから") return "TZq4_SNS_X";
  if (mtn === "Instagramプロフィールから") return "TZq4_SNS_IG";
  if (mtn === "TikTokのプロフィールから") return "TZq4_SNS_TIKTOK";
  // YouTube 動画タイトル (日付＋大学等) → TZq4_YT_VIDEO
  // 概要欄・投稿の区別が付かない場合は VIDEO 扱い
  return "TZq4_YT_VIDEO";
}

// TZq4 分類してINLINEに投入 (仮想シナリオID別)
const tzq4Groups = new Map();
for (const r of tzq4All) {
  const virtSce = classifyTZq4(r.mtn);
  if (!tzq4Groups.has(virtSce)) tzq4Groups.set(virtSce, []);
  tzq4Groups.get(virtSce).push(r);
}
const TZQ4_LABELS = {
  TZq4_YT_VIDEO: "地方医学部/YouTube動画",
  TZq4_YT_DESC: "地方医学部/YouTube概要欄",
  TZq4_YT_POST: "地方医学部/YouTube投稿",
  TZq4_SNS_THREADS: "地方医学部/Threads",
  TZq4_SNS_X: "地方医学部/X",
  TZq4_SNS_IG: "地方医学部/Instagram",
  TZq4_SNS_TIKTOK: "地方医学部/TikTok",
  TZq4_HP_BLOG: "地方医学部/HPブログ",
  TZq4_HP_UTAGE: "地方医学部/HP UTAGE",
  TZq4_META_REUSE: "地方医学部/メタ広告(合流)再受験",
  TZq4_META_K12: "地方医学部/メタ広告(合流)K12",
  TZq4_UNK: "地方医学部/UNK",
};
for (const [virtSce, records] of tzq4Groups.entries()) {
  INLINE.push({
    acc: "TZq4ob5n4GZ1", sce: virtSce, label: TZQ4_LABELS[virtSce] || virtSce,
    records,
  });
}

// ---- Notion データロード ----
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
  const scenarioLatest = new Map();
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100 });
    for (const p of res.results) {
      const d = p.properties["日付"]?.date?.start ?? "";
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      map.set(`${d}|${a}|${s}`, p.id);
      const scKey = `${a}|${s}`;
      const prev = scenarioLatest.get(scKey) ?? "";
      if (d > prev) scenarioLatest.set(scKey, d);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return { map, scenarioLatest };
}

const masters = await loadMasters();
const { map: existing, scenarioLatest } = await loadExisting();
console.log(`流入経路マスター: ${masters.size}件 / 既存日次: ${existing.size}件`);

// ---- 集計 & upsert ----
let created = 0, updated = 0, skipped_master = 0, skipped_filter = 0;
for (const e of INLINE) {
  const masterId = masters.get(`${e.acc}|${e.sce}`);
  if (!masterId) {
    console.log(`! マスター未登録: ${e.label} (${e.acc}|${e.sce})`);
    skipped_master += e.records.length;
    continue;
  }
  const cutoff = scenarioLatest.get(`${e.acc}|${e.sce}`) ?? "";
  // メタ広告シナリオ(n99EYdMfgwxy VJHxg3hQn8qy)は「メインの公式LINEから」を除外
  const isN99Meta = e.acc === "n99EYdMfgwxy" && e.sce === "VJHxg3hQn8qy";
  const filtered = e.records.filter(r => {
    if (isN99Meta && r.mtn === "メインの公式LINEから") return false;
    const d = r.base_date.slice(0, 10);
    if (d <= cutoff) return false;
    return true;
  });
  skipped_filter += e.records.length - filtered.length;

  const dailyCount = new Map();
  for (const r of filtered) {
    const d = r.base_date.slice(0, 10);
    dailyCount.set(d, (dailyCount.get(d) ?? 0) + 1);
  }
  if (dailyCount.size === 0) continue;

  console.log(`\n=== ${e.label} (${e.acc}|${e.sce}) cutoff=${cutoff} ===`);
  for (const [date, count] of [...dailyCount.entries()].sort()) {
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
      await notion.pages.update({ page_id: existing.get(key), properties: props });
      updated++;
      console.log(`  ~ ${date} ${count}件`);
    } else {
      await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
      created++;
      console.log(`  + ${date} ${count}件`);
    }
  }
}

console.log(`\n---\n新規${created} / 更新${updated} / スキップ(マスター無)${skipped_master} / スキップ(cutoff/除外)${skipped_filter}`);
