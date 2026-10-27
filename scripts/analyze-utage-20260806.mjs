// UTAGE → Notion 同期: 2026-08-06 時点で 各 (acc|sce) の Notion 最新日付以降を抽出
import fs from "fs";

const TZQ4_P1 = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/1f6e7386-0695-4e8e-80f4-7a69db8277ef/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1785974940235.txt";
const TZQ4_P2 = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/1f6e7386-0695-4e8e-80f4-7a69db8277ef/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1785974982937.txt";

function loadResult(path) {
  const wrap = JSON.parse(fs.readFileSync(path, "utf8"));
  return JSON.parse(wrap[0].text).data;
}

// Notion 最新日付 (>= filter — 最新日付含めて再upsert)
const LATEST = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-08-04",
  "PjocL14v2u6j|V98BSMwhViZC": "2026-08-04",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "2026-07-31",
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
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "2026-08-01",
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE": "2026-08-03",
  "TZq4ob5n4GZ1|TZq4_META_REUSE": "2026-08-02",
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
  if (mtn.includes("音声・記事のページ")) return "TZq4_HP_UTAGE";
  if (mtn.includes("YouTube概要欄")) return "TZq4_YT_DESC";
  if (mtn.includes("YouTube投稿")) return "TZq4_YT_POST";
  return "TZq4_YT_VIDEO";
}

// yyog9fvedOtP (peek data)
const YYOG = [
  ["2026-08-05"], ["2026-08-05"], ["2026-08-04"],
];

// V98BSMwhViZC (all null mtn, dates >= 2026-04-12)
const V98 = [
  ["2026-08-04"], ["2026-08-03"], ["2026-08-01"], ["2026-07-31"],
  ["2026-07-24"], ["2026-07-21"], ["2026-07-20"], ["2026-07-19"],
  ["2026-07-16"], ["2026-07-15"], ["2026-07-03"], ["2026-06-29"],
  ["2026-06-28"], ["2026-06-20"], ["2026-06-16"], ["2026-06-16"],
  ["2026-06-14"], ["2026-06-13"], ["2026-06-13"], ["2026-06-13"],
  ["2026-06-12"], ["2026-06-09"], ["2026-06-08"], ["2026-06-07"],
  ["2026-06-05"], ["2026-06-04"], ["2026-06-03"], ["2026-05-30"],
  ["2026-05-27"], ["2026-05-24"], ["2026-05-22"], ["2026-05-18"],
  ["2026-05-18"], ["2026-05-12"], ["2026-05-09"], ["2026-05-07"],
  ["2026-05-05"], ["2026-05-04"], ["2026-05-02"], ["2026-05-01"],
  ["2026-04-24"], ["2026-04-23"], ["2026-04-22"], ["2026-04-22"],
  ["2026-04-21"], ["2026-04-20"], ["2026-04-20"], ["2026-04-20"],
  ["2026-04-18"], ["2026-04-17"], ["2026-04-16"], ["2026-04-14"],
  ["2026-04-12"], ["2026-04-12"],
];

// ss0Y2tqzi9hW (Yotube leads, dates only)
const SS0 = [
  ["2026-07-31"], ["2026-07-31"], ["2026-07-30"], ["2026-07-07"],
  ["2026-06-28"], ["2026-06-08"], ["2026-05-26"], ["2026-05-18"],
  ["2026-05-17"], ["2026-05-12"],
];

// XAz7XmBFO3yX
const XAZ = [
  ["2026-06-10"], ["2026-06-09"], ["2026-06-05"], ["2026-06-04"],
  ["2026-06-04"], ["2026-06-02"], ["2026-05-26"], ["2026-05-21"],
  ["2026-05-20"], ["2026-05-19"], ["2026-05-18"], ["2026-05-18"],
  ["2026-05-13"], ["2026-05-12"], ["2026-05-11"], ["2026-05-10"],
  ["2026-05-09"],
];

// OQu9St8wqN9R
const OQU = [["2026-05-19"]];

// fpZvVLcMvLMK
const FPZ = [
  ["2026-06-13"], ["2026-05-28"], ["2026-05-24"], ["2026-05-21"],
  ["2026-05-21"], ["2026-05-19"], ["2026-05-19"], ["2026-05-19"],
];

// NidcrIoR9Aqi
const NID = [["2026-05-26"], ["2026-05-19"]];

// VJHxg3hQn8qy — mtn "メインの公式LINEから" は除外
const VJH = [
  ["2026-06-13", null], ["2026-06-13", null], ["2026-06-12", null],
  ["2026-06-08", null], ["2026-06-08", "メインの公式LINEから"],
  ["2026-06-07", "メインの公式LINEから"], ["2026-06-07", "メインの公式LINEから"],
  ["2026-06-07", null], ["2026-06-07", "メインの公式LINEから"],
  ["2026-06-07", null], ["2026-06-07", null], ["2026-06-07", null],
  ["2026-06-07", null],
];

// zZe1kylB5Nfr
const ZZE = [["2026-06-13"], ["2026-06-08"], ["2026-06-07"]];

// TZq4 pages 1, 2, 3
const TZQ4_1 = loadResult(TZQ4_P1);
const TZQ4_2 = loadResult(TZQ4_P2);
// Page 3 — inline (2025-04-15 to 2025-10-13)
const TZQ4_3 = [
  ["2025-10-13", "4/29【九州大学医学科受験】「数学」「英語」の高1から受験までの勉強法【宮崎大学医学科 後期 主席】"],
  ["2025-10-13", "YouTube概要欄"],
  ["2025-10-12", "10/5 【九州大学医学科】この参考書が最強！使った参考書とメソッドを徹底解説！"],
  ["2025-10-11", "Threadsプロフィールから"],
  ["2025-10-06", "10/1【これが合格の秘訣！】各教科ごとの参考書と勉強法をガッツリ解説！【神戸大学医学科】"],
  ["2025-10-04", "9/24 【神戸大学医学部医学科】ズバリ攻略法はこれ！実際の過去問を使って徹底解説！"],
  ["2025-10-03", "10/1【これが合格の秘訣！】各教科ごとの参考書と勉強法をガッツリ解説！【神戸大学医学科】"],
  ["2025-10-02", "10/1【これが合格の秘訣！】各教科ごとの参考書と勉強法をガッツリ解説！【神戸大学医学科】"],
  ["2025-09-30", "YouTube概要欄"],
  ["2025-09-25", "Xプロフィールから"],
  ["2025-09-25", null],
  ["2025-09-23", "5/4【九大医学科の理科】化学が1冊で十分ってホント!? 「理科」を医学科合格レベルに持っていく参考書ルート"],
  ["2025-09-19", "YouTube概要欄"],
  ["2025-09-17", "Threadsプロフィールから"],
  ["2025-09-14", "8/29 【産医の併願を考える人へ】産業医ってどんな仕事？【産業医科大 医学科生が語る】"],
  ["2025-09-10", "5/9【香川大学医学科】推薦の「志望理由書」と「面接」対策の進め方！【準備が9割！医学科受験の推薦入試】"],
  ["2025-09-10", "Threadsプロフィールから"],
  ["2025-09-09", "Xプロフィールから"],
  ["2025-09-07", "Threadsプロフィールから"],
  ["2025-09-05", "5/13【定期テストTOP3】高1・高2の医学科志望生の生活とは【和歌山県立医科大現役合格】"],
  ["2025-09-05", "Threadsプロフィールから"],
  ["2025-09-05", "【令和の虎出演】医学科生なのに起業！？国際医療福祉大学の医学科での起業経験とは"],
  ["2025-09-04", "Threadsプロフィールから"],
  ["2025-09-03", "TikTokのプロフィールから"],
  ["2025-09-03", "Xプロフィールから"],
];

const result = {};
function add(key, date) {
  if (!result[key]) result[key] = {};
  result[key][date] = (result[key][date] ?? 0) + 1;
}

for (const [d] of YYOG) add("PjocL14v2u6j|yyog9fvedOtP", d);
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

// TZq4 pages 1 & 2 from file (full records)
for (const r of TZQ4_1) {
  const v = classifyTZq4(r.message_tracking_name);
  add(`TZq4ob5n4GZ1|${v}`, r.base_date.slice(0, 10));
}
for (const r of TZQ4_2) {
  const v = classifyTZq4(r.message_tracking_name);
  add(`TZq4ob5n4GZ1|${v}`, r.base_date.slice(0, 10));
}
for (const [d, mtn] of TZQ4_3) {
  const v = classifyTZq4(mtn);
  add(`TZq4ob5n4GZ1|${v}`, d);
}

console.log("=== 各 (acc|sce) の Notion 最新日付以降の日別カウント ===");
const filtered = {};
for (const [key, daily] of Object.entries(result)) {
  const latest = LATEST[key];
  if (!latest) { console.log(`! 未定義: ${key}`); continue; }
  const f = {};
  for (const [date, cnt] of Object.entries(daily)) {
    if (date > latest) f[date] = cnt;
  }
  if (Object.keys(f).length > 0) filtered[key] = f;
}

for (const [key, daily] of Object.entries(filtered)) {
  const sorted = Object.fromEntries(Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])));
  console.log(`  ${key.padEnd(40)} latest=${LATEST[key]}:`, sorted);
}

fs.writeFileSync("/tmp/utage-20260806-result.json", JSON.stringify(filtered, null, 2));
console.log("\n→ /tmp/utage-20260806-result.json に保存");
