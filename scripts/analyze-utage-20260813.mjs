// UTAGE → Notion 同期分析 (2026-08-13)
// per-scenario Notion 最新日付 より新しい (>) レコードを抽出 → 日別カウント
import fs from "fs";

const YYOG_PATH = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/bd5d46ea-b945-449e-9cc2-a74ff10791f8/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1786579772214.txt";
const TZQ4_P1 = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/bd5d46ea-b945-449e-9cc2-a74ff10791f8/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1786579782082.txt";
const TZQ4_P2 = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/bd5d46ea-b945-449e-9cc2-a74ff10791f8/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1786579817673.txt";
const TZQ4_P3 = "./scripts/tzq4-page3-20260813.json";

function loadResult(path) {
  const wrap = JSON.parse(fs.readFileSync(path, "utf8"));
  return JSON.parse(wrap[0].text).data;
}

// 使用するのは per-scenario の Notion 最新日付
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
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "2026-08-09",
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

// 小さい結果はレスポンスから直接抜き出す ([date, mtn])
// V98 (PjocL14v2u6j|V98BSMwhViZC): 55件, latest 08-09 → 08-09 以降のみ
const V98 = [
  ["2026-08-09", null],
];
// ss0 (PjocL14v2u6j|ss0Y2tqzi9hW): 11件, latest 08-07 → 08-07 以降のみ
// 08-07 は既に登録済(latest)なので > で除外される
const SS0 = [
  ["2026-08-07", "6/7"], // = latest, > で除外
];
// XAZ (7qQJ38rzLtbM|XAz7XmBFO3yX): 17件, latest 06-10
const XAZ = [
  ["2026-06-10", null], // = latest, > で除外
];
const OQU = []; // 最新1件のみ, 全て latest 以前
const FPZ = [
  ["2026-06-13", null], // = latest, > で除外
];
const NID = []; // latest 以降なし
// VJH (n99 メタ広告): latest 06-13, 「メインの公式LINEから」除外
const VJH = [
  ["2026-06-13", null],
  ["2026-06-13", null],
];
const ZZE = [
  ["2026-06-13", null],
];

function toDateOnly(iso) { return iso.slice(0, 10); }

function dailyCount(records, latest, filter = null) {
  const bucket = {};
  const filtered = filter ? records.filter(filter) : records;
  for (const [date, _] of filtered) {
    // strict > (base_date > 最新日付)
    if (date <= latest) continue;
    bucket[date] = (bucket[date] || 0) + 1;
  }
  return bucket;
}

// yyog: PjocL14v2u6j|yyog9fvedOtP
const yyogData = loadResult(YYOG_PATH);
console.error(`yyog: ${yyogData.length}件 (total: ${JSON.parse(JSON.parse(fs.readFileSync(YYOG_PATH,'utf8'))[0].text).meta.total})`);
const yyogRecs = yyogData.map(r => [toDateOnly(r.base_date), r.message_tracking_name]);

// tzq4: TZq4ob5n4GZ1|9lF9qbjgG5a8 (3ページ分)
const tzq4P1 = loadResult(TZQ4_P1);
const tzq4P2 = loadResult(TZQ4_P2);
const tzq4P3 = JSON.parse(fs.readFileSync(TZQ4_P3, "utf8"));
const tzq4Recs = [
  ...tzq4P1.map(r => [toDateOnly(r.base_date), r.message_tracking_name]),
  ...tzq4P2.map(r => [toDateOnly(r.base_date), r.message_tracking_name]),
  ...tzq4P3,
];
console.error(`tzq4: ${tzq4Recs.length}件 (total: ${JSON.parse(JSON.parse(fs.readFileSync(TZQ4_P1,'utf8'))[0].text).meta.total})`);

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
