// UTAGE → Notion 同期 (2026-06-24): 各 (acc|sce) の Notion 最新日付以降の日別カウント抽出
import fs from "fs";

const TZQ4_P1 = JSON.parse(fs.readFileSync("/tmp/tzq4-p1.json", "utf8")).data;
const TZQ4_P2 = JSON.parse(fs.readFileSync("/tmp/tzq4-p2.json", "utf8")).data;
const YYOG_P1 = JSON.parse(fs.readFileSync("/tmp/yyog-p1.json", "utf8")).data;

// V98BSMwhViZC (PjocL14v2u6j) — 41件 全件 (page 1 のみ)
const V98_DATES = [
  "2026-06-20","2026-06-16","2026-06-16","2026-06-14","2026-06-13","2026-06-13","2026-06-13","2026-06-12",
  "2026-06-09","2026-06-08","2026-06-07","2026-06-05","2026-06-04","2026-06-03","2026-05-30","2026-05-27",
  "2026-05-24","2026-05-22","2026-05-18","2026-05-18","2026-05-12","2026-05-09","2026-05-07","2026-05-05",
  "2026-05-04","2026-05-02","2026-05-01","2026-04-24","2026-04-23","2026-04-22","2026-04-22","2026-04-21",
  "2026-04-20","2026-04-20","2026-04-20","2026-04-18","2026-04-17","2026-04-16","2026-04-14","2026-04-12","2026-04-12",
];
// ss0Y2tqzi9hW (PjocL14v2u6j) — 5件
const SS0_DATES = ["2026-06-08","2026-05-26","2026-05-18","2026-05-17","2026-05-12"];
// XAz7XmBFO3yX (7qQJ38rzLtbM) — 17件
const XAZ_DATES = [
  "2026-06-10","2026-06-09","2026-06-05","2026-06-04","2026-06-04","2026-06-02","2026-05-26",
  "2026-05-21","2026-05-20","2026-05-19","2026-05-18","2026-05-18","2026-05-13","2026-05-12",
  "2026-05-11","2026-05-10","2026-05-09",
];
// OQu9St8wqN9R (7qQJ38rzLtbM) — 1件
const OQU_DATES = ["2026-05-19"];
// fpZvVLcMvLMK (Tm32etw7epfS) — 8件
const FPZ_DATES = ["2026-06-13","2026-05-28","2026-05-24","2026-05-21","2026-05-21","2026-05-19","2026-05-19","2026-05-19"];
// NidcrIoR9Aqi (Tm32etw7epfS) — 2件
const NID_DATES = ["2026-05-26","2026-05-19"];
// zZe1kylB5Nfr (n99EYdMfgwxy) — 3件
const ZZE_DATES = ["2026-06-13","2026-06-08","2026-06-07"];
// VJHxg3hQn8qy (n99EYdMfgwxy) — 13件, "メインの公式LINEから" 除外
const VJH_RAW = [
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

const LATEST = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-06-16",
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

const result = {};
function add(key, date) {
  if (!result[key]) result[key] = {};
  result[key][date] = (result[key][date] ?? 0) + 1;
}

// yyog9fvedOtP - page 1
for (const r of YYOG_P1) {
  add("PjocL14v2u6j|yyog9fvedOtP", r.base_date.slice(0, 10));
}
// シンプル inline
for (const d of V98_DATES) add("PjocL14v2u6j|V98BSMwhViZC", d);
for (const d of SS0_DATES) add("PjocL14v2u6j|ss0Y2tqzi9hW", d);
for (const d of XAZ_DATES) add("7qQJ38rzLtbM|XAz7XmBFO3yX", d);
for (const d of OQU_DATES) add("7qQJ38rzLtbM|OQu9St8wqN9R", d);
for (const d of FPZ_DATES) add("Tm32etw7epfS|fpZvVLcMvLMK", d);
for (const d of NID_DATES) add("Tm32etw7epfS|NidcrIoR9Aqi", d);
for (const d of ZZE_DATES) add("n99EYdMfgwxy|zZe1kylB5Nfr", d);
for (const r of VJH_RAW) {
  if (r.mtn === "メインの公式LINEから") continue;
  add("n99EYdMfgwxy|VJHxg3hQn8qy", r.date);
}
// TZq4: page1+page2
for (const r of [...TZQ4_P1, ...TZQ4_P2]) {
  const v = classifyTZq4(r.mtn);
  add(`TZq4ob5n4GZ1|${v}`, r.base_date.slice(0, 10));
}

// Notion 最新日付以降のみフィルタ (>= latest)
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

fs.writeFileSync("/tmp/utage-20260624-result.json", JSON.stringify(filtered, null, 2));
console.log("\n→ /tmp/utage-20260624-result.json に保存");
