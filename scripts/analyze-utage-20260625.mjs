// UTAGE → Notion 同期: 2026-06-25 時点で 各 (acc|sce) の Notion 最新日付以降を抽出
import fs from "fs";

const YYOG_FILE = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/7efd0ea6-586a-41e5-89b8-dd640771cd2f/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1782356798192.txt";
const TZQ4_FILE = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/7efd0ea6-586a-41e5-89b8-dd640771cd2f/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1782356888764.txt";

function loadResult(path) {
  const wrap = JSON.parse(fs.readFileSync(path, "utf8"));
  return JSON.parse(wrap[0].text).data;
}

// インラインデータ: 各 (acc|sce) の取得済みリーダー base_date と message_tracking_name
const V98 = [
  ["2026-06-20", null], ["2026-06-16", null], ["2026-06-16", null], ["2026-06-14", null],
  ["2026-06-13", null], ["2026-06-13", null], ["2026-06-13", null], ["2026-06-12", null],
  ["2026-06-09", null], ["2026-06-08", null], ["2026-06-07", null], ["2026-06-05", null],
  ["2026-06-04", null], ["2026-06-03", null], ["2026-05-30", null], ["2026-05-27", null],
  ["2026-05-24", null], ["2026-05-22", null], ["2026-05-18", null], ["2026-05-18", null],
  ["2026-05-12", null], ["2026-05-09", null], ["2026-05-07", null], ["2026-05-05", null],
  ["2026-05-04", null], ["2026-05-02", null], ["2026-05-01", null], ["2026-04-24", null],
  ["2026-04-23", null], ["2026-04-22", null], ["2026-04-22", null], ["2026-04-21", null],
  ["2026-04-20", null], ["2026-04-20", null], ["2026-04-20", null], ["2026-04-18", null],
  ["2026-04-17", null], ["2026-04-16", null], ["2026-04-14", null], ["2026-04-12", null],
  ["2026-04-12", null],
];
const SS0 = [
  ["2026-06-08"], ["2026-05-26"], ["2026-05-18"], ["2026-05-17"], ["2026-05-12"],
];
const XAZ = [
  ["2026-06-10"], ["2026-06-09"], ["2026-06-05"], ["2026-06-04"], ["2026-06-04"],
  ["2026-06-02"], ["2026-05-26"], ["2026-05-21"], ["2026-05-20"], ["2026-05-19"],
  ["2026-05-18"], ["2026-05-18"], ["2026-05-13"], ["2026-05-12"], ["2026-05-11"],
  ["2026-05-10"], ["2026-05-09"],
];
const OQU = [["2026-05-19"]];
const FPZ = [
  ["2026-06-13"], ["2026-05-28"], ["2026-05-24"], ["2026-05-21"], ["2026-05-21"],
  ["2026-05-19"], ["2026-05-19"], ["2026-05-19"],
];
const NID = [["2026-05-26"], ["2026-05-19"]];

// VJHxg3hQn8qy: mtn===「メインの公式LINEから」は集計外
const VJH = [
  ["2026-06-13", null], ["2026-06-13", null], ["2026-06-12", null],
  ["2026-06-08", null], ["2026-06-08", "メインの公式LINEから"],
  ["2026-06-07", "メインの公式LINEから"], ["2026-06-07", "メインの公式LINEから"],
  ["2026-06-07", null], ["2026-06-07", "メインの公式LINEから"], ["2026-06-07", null],
  ["2026-06-07", null], ["2026-06-07", null], ["2026-06-07", null],
];
const ZZE = [["2026-06-13"], ["2026-06-08"], ["2026-06-07"]];

const YYOG_DATA = loadResult(YYOG_FILE);
const TZQ4_DATA = loadResult(TZQ4_FILE);

const LATEST = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-06-24",
  "PjocL14v2u6j|V98BSMwhViZC": "2026-06-20",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "2026-06-08",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "2026-06-10",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "2026-05-19",
  "Tm32etw7epfS|fpZvVLcMvLMK": "2026-06-13",
  "Tm32etw7epfS|NidcrIoR9Aqi": "2026-05-26",
  "n99EYdMfgwxy|VJHxg3hQn8qy": "2026-06-13",
  "n99EYdMfgwxy|zZe1kylB5Nfr": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "2026-06-21",
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
  "TZq4ob5n4GZ1|TZq4_STANDFM": "1970-01-01",
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
  if (mtn.includes("音声・記事のページ")) return "TZq4_HP_UTAGE";
  if (mtn.includes("YouTube概要欄")) return "TZq4_YT_DESC";
  if (mtn.includes("YouTube投稿")) return "TZq4_YT_POST";
  return "TZq4_YT_VIDEO";
}

const result = {};
function add(key, date) {
  if (!result[key]) result[key] = {};
  result[key][date] = (result[key][date] ?? 0) + 1;
}

// yyog9fvedOtP (取得済み100件、最新分のみ — Notion latest=2026-06-24 から判断)
for (const r of YYOG_DATA) {
  const date = r.base_date.slice(0, 10);
  add("PjocL14v2u6j|yyog9fvedOtP", date);
}

for (const [d] of V98) add("PjocL14v2u6j|V98BSMwhViZC", d);
for (const [d] of SS0) add("PjocL14v2u6j|ss0Y2tqzi9hW", d);
for (const [d] of XAZ) add("7qQJ38rzLtbM|XAz7XmBFO3yX", d);
for (const [d] of OQU) add("7qQJ38rzLtbM|OQu9St8wqN9R", d);
for (const [d] of FPZ) add("Tm32etw7epfS|fpZvVLcMvLMK", d);
for (const [d] of NID) add("Tm32etw7epfS|NidcrIoR9Aqi", d);

for (const [d, mtn] of VJH) {
  if (mtn === "メインの公式LINEから") continue;
  add("n99EYdMfgwxy|VJHxg3hQn8qy", d);
}
for (const [d] of ZZE) add("n99EYdMfgwxy|zZe1kylB5Nfr", d);

for (const r of TZQ4_DATA) {
  const v = classifyTZq4(r.message_tracking_name);
  const date = r.base_date.slice(0, 10);
  add(`TZq4ob5n4GZ1|${v}`, date);
}

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

fs.writeFileSync("/tmp/utage-20260625-result.json", JSON.stringify(filtered, null, 2));
console.log("\n→ /tmp/utage-20260625-result.json に保存");
