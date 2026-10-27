// UTAGE → Notion 同期分析 (2026-08-11)
// 各 (acc|sce) の Notion 最新日付以降(>=)を抽出 → 日別カウント
import fs from "fs";

const YYOG_PATH = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/7843ad08-6b93-47db-beb8-1f9cd7bbc691/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1786418453889.txt";
const TZQ4_PATH = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/7843ad08-6b93-47db-beb8-1f9cd7bbc691/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1786418464300.txt";

function loadResult(path) {
  const wrap = JSON.parse(fs.readFileSync(path, "utf8"));
  return JSON.parse(wrap[0].text).data;
}

const LATEST = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-08-09",
  "PjocL14v2u6j|V98BSMwhViZC": "2026-08-09",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "2026-08-07",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "2026-06-10",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "2026-05-19",
  "Tm32etw7epfS|fpZvVLcMvLMK": "2026-06-13",
  "Tm32etw7epfS|NidcrIoR9Aqi": "2026-05-26",
  "n99EYdMfgwxy|VJHxg3hQn8qy": "2026-06-13",
  "n99EYdMfgwxy|zZe1kylB5Nfr": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "2026-08-03",
  "TZq4ob5n4GZ1|TZq4_YT_DESC": "2026-02-24",
  "TZq4ob5n4GZ1|TZq4_YT_POST": "2026-04-30",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS": "2025-11-06",
  "TZq4ob5n4GZ1|TZq4_SNS_X": "2026-01-11",
  "TZq4ob5n4GZ1|TZq4_SNS_IG": "2026-05-03",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK": "2025-09-03",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "2026-08-07",
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

// 小さい結果は tool result 出力から取得(base_date日付+mtn)
const V98 = [
  ["2026-08-09", null], ["2026-08-04", null], ["2026-08-03", null], ["2026-08-01", null],
  ["2026-07-31", null], ["2026-07-24", null], ["2026-07-21", null], ["2026-07-20", null],
  ["2026-07-19", null], ["2026-07-16", null], ["2026-07-15", null], ["2026-07-03", null],
  ["2026-06-29", null], ["2026-06-28", null], ["2026-06-20", null], ["2026-06-16", null],
  ["2026-06-16", null], ["2026-06-14", null], ["2026-06-13", null], ["2026-06-13", null],
  ["2026-06-13", null], ["2026-06-12", null], ["2026-06-09", null], ["2026-06-08", null],
  ["2026-06-07", null], ["2026-06-05", null], ["2026-06-04", null], ["2026-06-03", null],
  ["2026-05-30", null], ["2026-05-27", null], ["2026-05-24", null], ["2026-05-22", null],
  ["2026-05-18", null], ["2026-05-18", null], ["2026-05-12", null], ["2026-05-09", null],
  ["2026-05-07", null], ["2026-05-05", null], ["2026-05-04", null], ["2026-05-02", null],
  ["2026-05-01", null], ["2026-04-24", null], ["2026-04-23", null], ["2026-04-22", null],
  ["2026-04-22", null], ["2026-04-21", null], ["2026-04-20", null], ["2026-04-20", null],
  ["2026-04-20", null], ["2026-04-18", null], ["2026-04-17", null], ["2026-04-16", null],
  ["2026-04-14", null], ["2026-04-12", null], ["2026-04-12", null],
];
const SS0 = [
  ["2026-08-07", "6/7"], ["2026-07-31", "5/17"], ["2026-07-31", "他LINEから"], ["2026-07-30", "5/11"],
  ["2026-07-07", "5/24"], ["2026-06-28", "6/7"], ["2026-06-08", "5/29"],
  ["2026-05-26", "5/11"], ["2026-05-18", "5/15"], ["2026-05-17", "5/17"],
  ["2026-05-12", "5/11"],
];
const XAZ = [
  ["2026-06-10", null], ["2026-06-09", null], ["2026-06-05", null], ["2026-06-04", null],
  ["2026-06-04", null], ["2026-06-02", null], ["2026-05-26", null], ["2026-05-21", null],
  ["2026-05-20", null], ["2026-05-19", null], ["2026-05-18", null], ["2026-05-18", null],
  ["2026-05-13", null], ["2026-05-12", null], ["2026-05-11", null], ["2026-05-10", null],
  ["2026-05-09", null],
];
const OQU = [["2026-05-19", null]];
const FPZ = [
  ["2026-06-13", null], ["2026-05-28", null], ["2026-05-24", null], ["2026-05-21", null],
  ["2026-05-21", null], ["2026-05-19", null], ["2026-05-19", null], ["2026-05-19", null],
];
const NID = [["2026-05-26", null], ["2026-05-19", null]];
// VJHxg3hQn8qy (n99 メタ広告) — 「メインの公式LINEから」除外
const VJH = [
  ["2026-06-13", null], ["2026-06-13", null], ["2026-06-12", null],
  ["2026-06-08", null], ["2026-06-08", "メインの公式LINEから"],
  ["2026-06-07", "メインの公式LINEから"], ["2026-06-07", "メインの公式LINEから"],
  ["2026-06-07", null], ["2026-06-07", "メインの公式LINEから"], ["2026-06-07", null],
  ["2026-06-07", null], ["2026-06-07", null], ["2026-06-07", null],
];
const ZZE = [
  ["2026-06-13", null], ["2026-06-08", null], ["2026-06-07", null],
];

function dailyCount(records, latest) {
  const bucket = {};
  for (const [date, _] of records) {
    if (date < latest) continue;
    bucket[date] = (bucket[date] || 0) + 1;
  }
  return bucket;
}

function toDateOnly(iso) { return iso.slice(0, 10); }

const yyogData = loadResult(YYOG_PATH);
const tzq4Data = loadResult(TZQ4_PATH);
console.error(`yyog: ${yyogData.length}件 / tzq4: ${tzq4Data.length}件`);

const yyogRecs = yyogData.map(r => [toDateOnly(r.base_date), r.message_tracking_name]);
const tzq4Recs = tzq4Data.map(r => [toDateOnly(r.base_date), r.message_tracking_name]);

const results = {};

function put(key, records, filter = null) {
  const latest = LATEST[key];
  const filtered = filter ? records.filter(filter) : records;
  const d = dailyCount(filtered, latest);
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
    if (!latest || date < latest) continue;
    if (!buckets[key]) buckets[key] = {};
    buckets[key][date] = (buckets[key][date] || 0) + 1;
  }
  Object.assign(results, buckets);
}

console.log(JSON.stringify(results, null, 2));
