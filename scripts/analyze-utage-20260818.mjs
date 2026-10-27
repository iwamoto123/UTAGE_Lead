// UTAGE → Notion 同期分析 (2026-08-18)
// per-scenario Notion 最新日付 より新しい (>) レコードを抽出 → 日別カウント
import fs from "fs";

const BASE = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/71cf7caf-4e62-4bc7-87f6-6175f47fcb77/tool-results/";
const YYOG_P1 = BASE + "mcp-claude_ai_UTAGE-message_reader_list_all-1787012769646.txt";
const YYOG_P2 = BASE + "mcp-claude_ai_UTAGE-message_reader_list_all-1787013781975.txt";
const TZQ4_P1 = BASE + "mcp-claude_ai_UTAGE-message_reader_list_all-1787012780364.txt";
const TZQ4_P2 = BASE + "mcp-claude_ai_UTAGE-message_reader_list_all-1787013777380.txt";
const TZQ4_P3 = BASE + "mcp-claude_ai_UTAGE-message_reader_list_all-1787013779481.txt";

function loadResult(path) {
  const wrap = JSON.parse(fs.readFileSync(path, "utf8"));
  return JSON.parse(wrap[0].text).data;
}

// per-scenario Notion 最新日付 (2026-08-18時点)
const LATEST = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-08-16",
  "PjocL14v2u6j|V98BSMwhViZC": "2026-08-13",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "2026-08-07",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "2026-06-10",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "2026-05-19",
  "Tm32etw7epfS|fpZvVLcMvLMK": "2026-06-13",
  "Tm32etw7epfS|NidcrIoR9Aqi": "2026-05-26",
  "n99EYdMfgwxy|VJHxg3hQn8qy": "2026-06-13",
  "n99EYdMfgwxy|zZe1kylB5Nfr": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "2026-08-15",
  "TZq4ob5n4GZ1|TZq4_YT_DESC": "2026-02-24",
  "TZq4ob5n4GZ1|TZq4_YT_POST": "2026-04-30",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS": "2025-11-06",
  "TZq4ob5n4GZ1|TZq4_SNS_X": "2026-01-11",
  "TZq4ob5n4GZ1|TZq4_SNS_IG": "2026-05-03",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK": "2025-09-03",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "2026-08-15",
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE": "2026-08-03",
  "TZq4ob5n4GZ1|TZq4_META_REUSE": "2026-08-07",
  "TZq4ob5n4GZ1|TZq4_META_K12": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_UNK": "2026-06-07",
  "TZq4ob5n4GZ1|TZq4_STANDFM": "2026-06-07",
};

function classifyTZq4(mtn) {
  if (!mtn) return "TZq4_UNK";
  if (mtn.includes("再受験コースのメタ広告から")) return "TZq4_META_REUSE";
  if (mtn.includes("高1 高2 お試しキャンペーンから")) return "TZq4_META_K12";
  if (mtn.includes("Threadsプロフィール")) return "TZq4_SNS_THREADS";
  if (mtn.includes("Xプロフィール")) return "TZq4_SNS_X";
  if (mtn.includes("Instagramプロフィール")) return "TZq4_SNS_IG";
  if (mtn.includes("TikTokのプロフィール")) return "TZq4_SNS_TIKTOK";
  if (mtn.includes("StandFM")) return "TZq4_STANDFM";
  if (mtn.includes("ブログ")) return "TZq4_HP_BLOG";
  if (mtn.includes("音声・記事のページ") || mtn.includes("HP画像")) return "TZq4_HP_UTAGE";
  if (mtn.includes("YouTube概要欄")) return "TZq4_YT_DESC";
  if (mtn.includes("YouTube投稿")) return "TZq4_YT_POST";
  return "TZq4_YT_VIDEO";
}

function toDateOnly(iso) { return iso.slice(0, 10); }

function dailyCount(records, latest, filter = null) {
  const bucket = {};
  const filtered = filter ? records.filter(filter) : records;
  for (const [date, _] of filtered) {
    if (date <= latest) continue;
    bucket[date] = (bucket[date] || 0) + 1;
  }
  return bucket;
}

// yyog: 2ページ分
const yyogRecs = [
  ...loadResult(YYOG_P1),
  ...loadResult(YYOG_P2),
].map(r => [toDateOnly(r.base_date), r.message_tracking_name]);
console.error(`yyog: ${yyogRecs.length}件`);

// tzq4: 3ページ分
const tzq4Recs = [
  ...loadResult(TZQ4_P1),
  ...loadResult(TZQ4_P2),
  ...loadResult(TZQ4_P3),
].map(r => [toDateOnly(r.base_date), r.message_tracking_name]);
console.error(`tzq4: ${tzq4Recs.length}件`);

// 小さい結果はレスポンスから直接抜き出す
// V98 latest=2026-08-13: 最新base_date=2026-08-13 → 0件
const V98 = [
  ["2026-08-13", null], // = latest, > で除外
];
// ss0 latest=2026-08-07: 最新base_date=2026-08-07 → 0件
const SS0 = [
  ["2026-08-07", "6/7"], // = latest, > で除外
];
// XAZ latest=2026-06-10: 最新=2026-06-10 → 0件
const XAZ = [
  ["2026-06-10", null], // = latest, > で除外
];
const OQU = []; // = latest のみ
const FPZ = [
  ["2026-06-13", null], // = latest, > で除外
];
const NID = []; // < latest のみ
// VJH n99 メタ広告 latest=2026-06-13, 「メインの公式LINEから」除外
const VJH = [
  ["2026-06-13", null], // = latest
  ["2026-06-13", null], // = latest
];
const ZZE = [
  ["2026-06-13", null], // = latest
];

const results = {};
function put(key, records, filter = null) {
  const d = dailyCount(records, LATEST[key], filter);
  if (Object.keys(d).length) results[key] = d;
}

put("PjocL14v2u6j|yyog9fvedOtP", yyogRecs);
put("PjocL14v2u6j|V98BSMwhViZC", V98);
put("PjocL14v2u6j|ss0Y2tqzi9hW", SS0);
put("7qQJ38rzLtbM|XAz7XmBFO3yX", XAZ);
put("7qQJ38rzLtbM|OQu9St8wqN9R", OQU);
put("Tm32etw7epfS|fpZvVLcMvLMK", FPZ);
put("Tm32etw7epfS|NidcrIoR9Aqi", NID);
put("n99EYdMfgwxy|VJHxg3hQn8qy", VJH, r => r[1] !== "メインの公式LINEから");
put("n99EYdMfgwxy|zZe1kylB5Nfr", ZZE);

// TZq4 通年シナリオ → mtn で bucket 化
{
  const buckets = {};
  for (const [date, mtn] of tzq4Recs) {
    const b = classifyTZq4(mtn);
    const key = `TZq4ob5n4GZ1|${b}`;
    const latest = LATEST[key];
    if (!latest || date <= latest) continue;
    if (!buckets[key]) buckets[key] = {};
    buckets[key][date] = (buckets[key][date] || 0) + 1;
  }
  Object.assign(results, buckets);
}

console.log(JSON.stringify(results, null, 2));
