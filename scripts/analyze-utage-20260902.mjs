// UTAGE リーダーデータ分析: 2026-09-02 同期用
import fs from "fs";

const BASE = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/d2158e9e-a863-4c9f-8763-1bbbdb35894c/tool-results";

function loadFile(fname) {
  const raw = fs.readFileSync(`${BASE}/${fname}`, "utf8");
  const arr = JSON.parse(raw);
  return JSON.parse(arr[0].text).data;
}

// per-scenario Notion 最新日付 (2026-09-02 時点)
const notionLatest = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-08-31",
  "PjocL14v2u6j|V98BSMwhViZC": "2026-08-24",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "2026-08-07",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "2026-06-10",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "2026-05-19",
  "Tm32etw7epfS|fpZvVLcMvLMK": "2026-06-13",
  "Tm32etw7epfS|NidcrIoR9Aqi": "2026-05-26",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "2026-08-30",
  "TZq4ob5n4GZ1|TZq4_YT_DESC": "2026-02-24",
  "TZq4ob5n4GZ1|TZq4_YT_POST": "2026-04-30",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS": "2025-11-06",
  "TZq4ob5n4GZ1|TZq4_SNS_X": "2026-01-11",
  "TZq4ob5n4GZ1|TZq4_SNS_IG": "2026-05-03",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK": "2025-09-03",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "2026-08-31",
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE": "2026-08-03",
  "TZq4ob5n4GZ1|TZq4_META_REUSE": "2026-08-24",
  "TZq4ob5n4GZ1|TZq4_META_K12": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_UNK": "2026-06-07",
  "n99EYdMfgwxy|VJHxg3hQn8qy": "2026-06-13",
  "n99EYdMfgwxy|zZe1kylB5Nfr": "2026-06-13",
};

const scenarioLabels = {
  "TZq4_YT_VIDEO": "地方医学部/YouTube動画",
  "TZq4_YT_DESC": "地方医学部/YouTube概要欄",
  "TZq4_YT_POST": "地方医学部/YouTube投稿",
  "TZq4_SNS_THREADS": "地方医学部/Threads",
  "TZq4_SNS_X": "地方医学部/X",
  "TZq4_SNS_IG": "地方医学部/Instagram",
  "TZq4_SNS_TIKTOK": "地方医学部/TikTok",
  "TZq4_HP_BLOG": "地方医学部/HPブログ",
  "TZq4_HP_UTAGE": "地方医学部/UTAGE記事",
  "TZq4_META_REUSE": "地方医学部/メタ広告(合流)再受験",
  "TZq4_META_K12": "地方医学部/メタ広告(合流)高1高2",
  "TZq4_UNK": "地方医学部/公式LINE等(不明)",
};

function classifyTZq4(mtn) {
  if (!mtn) return "TZq4_UNK";
  if (mtn.includes("再受験コースのメタ広告から")) return "TZq4_META_REUSE";
  if (mtn.includes("高1 高2 お試しキャンペーンから")) return "TZq4_META_K12";
  if (mtn.includes("Threadsプロフィール")) return "TZq4_SNS_THREADS";
  if (mtn.includes("Xプロフィール")) return "TZq4_SNS_X";
  if (mtn.includes("Instagramプロフィール")) return "TZq4_SNS_IG";
  if (mtn.includes("TikTokのプロフィール")) return "TZq4_SNS_TIKTOK";
  if (mtn.includes("ブログ記事") || mtn.includes("ブログの投稿記事")) return "TZq4_HP_BLOG";
  if (mtn.includes("音声・記事のページ") || mtn.includes("HP画像ページ") || mtn.includes("HP掲載")) return "TZq4_HP_UTAGE";
  if (mtn.includes("YouTube概要欄")) return "TZq4_YT_DESC";
  if (mtn.includes("YouTube投稿")) return "TZq4_YT_POST";
  return "TZq4_YT_VIDEO";
}

const entries = [];

// small inline datasets (no file needed) - hardcode as arrays of dates
function addFromInline(acc, sce, label, dates) {
  const latest = notionLatest[`${acc}|${sce}`];
  if (!latest) return;
  const daily = {};
  for (const d of dates) {
    if (d > latest) daily[d] = (daily[d] ?? 0) + 1;
  }
  if (Object.keys(daily).length > 0) entries.push({ acc, sce, label, daily });
}

// PjocL14v2u6j/ss0Y2tqzi9hW: latest reader 08-07, all <= 08-07
addFromInline("PjocL14v2u6j", "ss0Y2tqzi9hW", "再受験/YouTube",
  ["2026-08-07","2026-07-31","2026-07-31","2026-07-30","2026-07-07","2026-06-28","2026-06-08","2026-05-26","2026-05-18","2026-05-17","2026-05-12"]);

// 7qQJ38rzLtbM/XAz7XmBFO3yX
addFromInline("7qQJ38rzLtbM", "XAz7XmBFO3yX", "熊大特化/メタ広告",
  ["2026-06-10","2026-06-09","2026-06-05","2026-06-04","2026-06-04","2026-06-02","2026-05-26","2026-05-21","2026-05-20","2026-05-19","2026-05-18","2026-05-18","2026-05-13","2026-05-12","2026-05-11","2026-05-10","2026-05-09"]);

// 7qQJ38rzLtbM/OQu9St8wqN9R
addFromInline("7qQJ38rzLtbM", "OQu9St8wqN9R", "熊大特化/面談予約", ["2026-05-19"]);

// Tm32etw7epfS/fpZvVLcMvLMK
addFromInline("Tm32etw7epfS", "fpZvVLcMvLMK", "九州高1高2/メタ広告",
  ["2026-06-13","2026-05-28","2026-05-24","2026-05-21","2026-05-21","2026-05-19","2026-05-19","2026-05-19"]);

// Tm32etw7epfS/NidcrIoR9Aqi
addFromInline("Tm32etw7epfS", "NidcrIoR9Aqi", "九州/面談予約", ["2026-05-26","2026-05-19"]);

// n99EYdMfgwxy/VJHxg3hQn8qy: null=メタ広告実流入のみ、「メインの公式LINEから」は除外
// readers: 06-13, 06-13, 06-12, 06-08, 06-08(除外), 06-07(除外), 06-07(除外), 06-07, 06-07(除外), 06-07, 06-07, 06-07, 06-07
addFromInline("n99EYdMfgwxy", "VJHxg3hQn8qy", "総体後Zoom相談/メタ広告", []);

// n99EYdMfgwxy/zZe1kylB5Nfr
addFromInline("n99EYdMfgwxy", "zZe1kylB5Nfr", "総体後Zoom相談/面談予約", ["2026-06-13","2026-06-08","2026-06-07"]);

// PjocL14v2u6j/yyog9fvedOtP (file, 100件)
addFromInline; // placeholder
{
  const readers = loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788308345155.txt");
  const dates = readers.map(r => r.base_date.slice(0,10));
  const latest = notionLatest["PjocL14v2u6j|yyog9fvedOtP"];
  const daily = {};
  for (const d of dates) if (d > latest) daily[d] = (daily[d] ?? 0) + 1;
  if (Object.keys(daily).length > 0) entries.push({ acc:"PjocL14v2u6j", sce:"yyog9fvedOtP", label:"再受験/メタ広告", daily });
}

// PjocL14v2u6j/V98BSMwhViZC (file, 58件)
{
  const readers = loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788308351838.txt");
  const dates = readers.map(r => r.base_date.slice(0,10));
  const latest = notionLatest["PjocL14v2u6j|V98BSMwhViZC"];
  const daily = {};
  for (const d of dates) if (d > latest) daily[d] = (daily[d] ?? 0) + 1;
  if (Object.keys(daily).length > 0) entries.push({ acc:"PjocL14v2u6j", sce:"V98BSMwhViZC", label:"再受験/面談予約", daily });
}

// TZq4 通年シナリオ (page1-3)
{
  const readers = [
    ...loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788308362894.txt"),
    ...loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788308414976.txt"),
    ...loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788308416739.txt"),
  ];
  console.log(`TZq4 total loaded: ${readers.length}`);
  const buckets = {};
  for (const r of readers) {
    const virt = classifyTZq4(r.message_tracking_name);
    const date = r.base_date.slice(0, 10);
    if (!buckets[virt]) buckets[virt] = {};
    buckets[virt][date] = (buckets[virt][date] ?? 0) + 1;
  }
  for (const [virt, daily] of Object.entries(buckets)) {
    const latest = notionLatest[`TZq4ob5n4GZ1|${virt}`];
    if (!latest) { console.log(`! 未登録 ${virt}: skip`); continue; }
    const newDaily = {};
    for (const [date, cnt] of Object.entries(daily)) {
      if (date > latest) newDaily[date] = cnt;
    }
    if (Object.keys(newDaily).length > 0) {
      entries.push({ acc:"TZq4ob5n4GZ1", sce: virt, label: scenarioLabels[virt], daily: newDaily });
    }
  }
}

console.log("\n=== 同期対象 ===");
let grandTotal = 0;
for (const e of entries) {
  const total = Object.values(e.daily).reduce((s, n) => s + n, 0);
  grandTotal += total;
  console.log(`  ${e.acc}|${e.sce} (${e.label}): ${total}名`);
  for (const [d, c] of Object.entries(e.daily).sort()) {
    console.log(`    ${d}: ${c}`);
  }
}
console.log(`\n合計: ${grandTotal}名 / ${entries.length}シナリオ`);
if (entries.length === 0) console.log("(なし)");

fs.writeFileSync("scripts/utage-20260902-entries.json", JSON.stringify(entries, null, 2));
console.log(`\n保存: scripts/utage-20260902-entries.json`);
