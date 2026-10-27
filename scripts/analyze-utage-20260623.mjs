// UTAGE → Notion 同期: 各 (acc|sce) の Notion 最新日付より新しい/同日でカウント差分があるレコードを抽出
import fs from "fs";

const YYOG_FILE = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/f6593e38-c793-4fd9-99b1-4508f1b6e209/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1782174999789.txt";
const TZQ4_FILE = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/f6593e38-c793-4fd9-99b1-4508f1b6e209/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1782175010844.txt";

function loadResult(path) {
  const wrap = JSON.parse(fs.readFileSync(path, "utf8"));
  return JSON.parse(wrap[0].text).data;
}

// インラインのデータ (per_page=100 で 1ページ取得済み)
const INLINE = {
  // PjocL14v2u6j|V98BSMwhViZC - total 41
  "PjocL14v2u6j|V98BSMwhViZC": [
    ["2026-06-20",1],["2026-06-16",1],["2026-06-16",1],["2026-06-14",1],
    ["2026-06-13",1],["2026-06-13",1],["2026-06-13",1],["2026-06-12",1],
    ["2026-06-09",1],["2026-06-08",1],["2026-06-07",1],["2026-06-05",1],
    ["2026-06-04",1],["2026-06-03",1],["2026-05-30",1],["2026-05-27",1],
    ["2026-05-24",1],["2026-05-22",1],["2026-05-18",1],["2026-05-18",1],
    ["2026-05-12",1],["2026-05-09",1],["2026-05-07",1],["2026-05-05",1],
    ["2026-05-04",1],["2026-05-02",1],["2026-05-01",1],["2026-04-24",1],
    ["2026-04-23",1],["2026-04-22",1],["2026-04-22",1],["2026-04-21",1],
    ["2026-04-20",1],["2026-04-20",1],["2026-04-20",1],["2026-04-18",1],
    ["2026-04-17",1],["2026-04-16",1],["2026-04-14",1],["2026-04-12",1],
    ["2026-04-12",1],
  ],
  // PjocL14v2u6j|ss0Y2tqzi9hW - total 5
  "PjocL14v2u6j|ss0Y2tqzi9hW": [
    ["2026-06-08",1],["2026-05-26",1],["2026-05-18",1],["2026-05-17",1],["2026-05-12",1],
  ],
  // 7qQJ38rzLtbM|XAz7XmBFO3yX - total 17
  "7qQJ38rzLtbM|XAz7XmBFO3yX": [
    ["2026-06-10",1],["2026-06-09",1],["2026-06-05",1],["2026-06-04",1],
    ["2026-06-04",1],["2026-06-02",1],["2026-05-26",1],["2026-05-21",1],
    ["2026-05-20",1],["2026-05-19",1],["2026-05-18",1],["2026-05-18",1],
    ["2026-05-13",1],["2026-05-12",1],["2026-05-11",1],["2026-05-10",1],
    ["2026-05-09",1],
  ],
  // 7qQJ38rzLtbM|OQu9St8wqN9R - total 1
  "7qQJ38rzLtbM|OQu9St8wqN9R": [
    ["2026-05-19",1],
  ],
  // Tm32etw7epfS|fpZvVLcMvLMK - total 8
  "Tm32etw7epfS|fpZvVLcMvLMK": [
    ["2026-06-13",1],["2026-05-28",1],["2026-05-24",1],["2026-05-21",1],
    ["2026-05-21",1],["2026-05-19",1],["2026-05-19",1],["2026-05-19",1],
  ],
  // Tm32etw7epfS|NidcrIoR9Aqi - total 2
  "Tm32etw7epfS|NidcrIoR9Aqi": [
    ["2026-05-26",1],["2026-05-19",1],
  ],
  // n99EYdMfgwxy|VJHxg3hQn8qy - total 13 (メインの公式LINEから は除外)
  // tracking名で除外判定するためのデータ構造
  // n99EYdMfgwxy|zZe1kylB5Nfr - total 3
  "n99EYdMfgwxy|zZe1kylB5Nfr": [
    ["2026-06-13",1],["2026-06-08",1],["2026-06-07",1],
  ],
};

// VJHxg3hQn8qy: メインの公式LINE からは除外
const VJHX_RAW = [
  { date: "2026-06-13", mtn: null },
  { date: "2026-06-13", mtn: null },
  { date: "2026-06-12", mtn: null },
  { date: "2026-06-08", mtn: null },
  { date: "2026-06-08", mtn: "メインの公式LINEから" },
  { date: "2026-06-07", mtn: "メインの公式LINEから" },
  { date: "2026-06-07", mtn: "メインの公式LINEから" },
  { date: "2026-06-07", mtn: null },
  { date: "2026-06-07", mtn: "メインの公式LINEから" },
  { date: "2026-06-07", mtn: null },
  { date: "2026-06-07", mtn: null },
  { date: "2026-06-07", mtn: null },
  { date: "2026-06-07", mtn: null },
];

const YYOG_DATA = loadResult(YYOG_FILE);
const TZQ4_DATA = loadResult(TZQ4_FILE);

// Notion 最新日付
const LATEST = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-06-16",
  "PjocL14v2u6j|V98BSMwhViZC": "2026-06-16",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "2026-06-08",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "2026-06-10",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "2026-05-19",
  "Tm32etw7epfS|fpZvVLcMvLMK": "2026-06-13",
  "Tm32etw7epfS|NidcrIoR9Aqi": "2026-05-26",
  "n99EYdMfgwxy|VJHxg3hQn8qy": "2026-06-13",
  "n99EYdMfgwxy|zZe1kylB5Nfr": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "2026-06-14",
  "TZq4ob5n4GZ1|TZq4_YT_DESC": "2026-02-24",
  "TZq4ob5n4GZ1|TZq4_YT_POST": "2026-04-30",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS": "2025-11-06",
  "TZq4ob5n4GZ1|TZq4_SNS_X": "2026-01-11",
  "TZq4ob5n4GZ1|TZq4_SNS_IG": "2026-05-03",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK": "2025-09-03",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "2026-06-15",
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE": "2025-11-28",
  "TZq4ob5n4GZ1|TZq4_META_REUSE": "2026-06-19",
  "TZq4ob5n4GZ1|TZq4_META_K12": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_UNK": "2026-06-07",
};

function classifyTZq4(mtn) {
  if (!mtn) return "TZq4_UNK";
  if (mtn.includes("再受験コースのメタ広告から")) return "TZq4_META_REUSE";
  if (mtn.includes("高1 高2 お試しキャンペーンから")) return "TZq4_META_K12";
  if (mtn.includes("Threadsプロフィール")) return "TZq4_SNS_THREADS";
  if (mtn.includes("Xプロフィール")) return "TZq4_SNS_X";
  if (mtn.includes("Instagramプロフィール")) return "TZq4_SNS_IG";
  if (mtn.includes("TikTokのプロフィール")) return "TZq4_SNS_TIKTOK";
  if (mtn.includes("ブログ記事")) return "TZq4_HP_BLOG";
  if (mtn.includes("音声・記事のページ")) return "TZq4_HP_UTAGE";
  if (mtn.includes("YouTube概要欄")) return "TZq4_YT_DESC";
  if (mtn.includes("YouTube投稿")) return "TZq4_YT_POST";
  return "TZq4_YT_VIDEO";
}

// 各 (acc|sce) の date->count を集計
const result = {};
function add(key, date) {
  if (!result[key]) result[key] = {};
  result[key][date] = (result[key][date] ?? 0) + 1;
}

// yyog9fvedOtP
for (const r of YYOG_DATA) {
  const date = r.base_date.slice(0, 10);
  add("PjocL14v2u6j|yyog9fvedOtP", date);
}
// インライン
for (const [key, list] of Object.entries(INLINE)) {
  for (const [date] of list) add(key, date);
}
// VJHxg3hQn8qy 除外あり
for (const r of VJHX_RAW) {
  if (r.mtn === "メインの公式LINEから") continue;
  add("n99EYdMfgwxy|VJHxg3hQn8qy", r.date);
}
// TZq4
for (const r of TZQ4_DATA) {
  const v = classifyTZq4(r.message_tracking_name);
  const date = r.base_date.slice(0, 10);
  add(`TZq4ob5n4GZ1|${v}`, date);
}

// Notion 最新日付以降のみフィルタ (>= latest で 同日上書きも可能にする)
console.log("=== 各 (acc|sce) の Notion 最新日付以降の日別カウント ===");
const filtered = {};
for (const [key, daily] of Object.entries(result)) {
  const latest = LATEST[key];
  if (!latest) { console.log(`! 未定義: ${key}`); continue; }
  const f = {};
  for (const [date, cnt] of Object.entries(daily)) {
    if (date >= latest) f[date] = cnt;
  }
  if (Object.keys(f).length > 0) filtered[key] = f;
}

for (const [key, daily] of Object.entries(filtered)) {
  console.log(`  ${key.padEnd(40)} latest=${LATEST[key]}:`, daily);
}

fs.writeFileSync("/tmp/utage-20260623-result.json", JSON.stringify(filtered, null, 2));
console.log("\n→ /tmp/utage-20260623-result.json に保存");
