// UTAGE リーダーデータ分析: 2026-09-01 同期用
import fs from "fs";

const BASE = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/5e1a3060-7f5e-4026-ac26-0777bdfdb910/tool-results";

function loadFile(fname) {
  const raw = fs.readFileSync(`${BASE}/${fname}`, "utf8");
  const arr = JSON.parse(raw);
  return JSON.parse(arr[0].text).data;
}

const notionLatest = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-08-31",
  "PjocL14v2u6j|V98BSMwhViZC": "2026-08-24",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "2026-08-07",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "2026-06-10",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "2026-05-19",
  "Tm32etw7epfS|fpZvVLcMvLMK": "2026-06-13",
  "Tm32etw7epfS|NidcrIoR9Aqi": "2026-05-26",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "2026-08-29",
  "TZq4ob5n4GZ1|TZq4_YT_DESC": "2026-02-24",
  "TZq4ob5n4GZ1|TZq4_YT_POST": "2026-04-30",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS": "2025-11-06",
  "TZq4ob5n4GZ1|TZq4_SNS_X": "2026-01-11",
  "TZq4ob5n4GZ1|TZq4_SNS_IG": "2026-05-03",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK": "2025-09-03",
  "TZq4ob5n4GZ1|TZq4_STANDFM": "2026-06-07",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "2026-08-16",
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
  "TZq4_STANDFM": "地方医学部/StandFM",
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
  if (mtn.includes("StandFM")) return "TZq4_STANDFM";
  if (mtn.includes("ブログ記事") || mtn.includes("ブログの投稿記事")) return "TZq4_HP_BLOG";
  if (mtn.includes("音声・記事のページ") || mtn.includes("HP画像ページ") || mtn.includes("HP掲載")) return "TZq4_HP_UTAGE";
  if (mtn.includes("YouTube概要欄")) return "TZq4_YT_DESC";
  if (mtn.includes("YouTube投稿")) return "TZq4_YT_POST";
  return "TZq4_YT_VIDEO";
}

const entries = [];

function addScenarioEntry(acc, sce, label, readers) {
  const latest = notionLatest[`${acc}|${sce}`];
  if (!latest) { console.log(`! Notion latest 未登録: ${acc}|${sce}`); return; }
  const daily = {};
  for (const r of readers) {
    const date = r.base_date.slice(0, 10);
    if (date > latest) daily[date] = (daily[date] ?? 0) + 1;
  }
  if (Object.keys(daily).length > 0) {
    entries.push({ acc, sce, label, daily });
  }
}

// PjocL14v2u6j|yyog9fvedOtP
addScenarioEntry("PjocL14v2u6j", "yyog9fvedOtP", "再受験/メタ広告",
  loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788221064663.txt"));

// PjocL14v2u6j|V98BSMwhViZC
addScenarioEntry("PjocL14v2u6j", "V98BSMwhViZC", "再受験/面談予約",
  loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788221066763.txt"));

// TZq4 通年シナリオ (page 1-3)
{
  const readers = [
    ...loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788221075612.txt"),
    ...loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788221077660.txt"),
    ...loadFile("mcp-claude_ai_UTAGE-message_reader_list_all-1788221079481.txt"),
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
      entries.push({ acc: "TZq4ob5n4GZ1", sce: virt, label: scenarioLabels[virt], daily: newDaily });
    }
  }
}

console.log("\n=== 同期対象 ===");
for (const e of entries) {
  const total = Object.values(e.daily).reduce((s, n) => s + n, 0);
  console.log(`  ${e.acc}|${e.sce} (${e.label}): ${total}名`);
  for (const [d, c] of Object.entries(e.daily).sort()) {
    console.log(`    ${d}: ${c}`);
  }
}
if (entries.length === 0) console.log("(なし)");

fs.writeFileSync("scripts/utage-20260901-entries.json", JSON.stringify(entries, null, 2));
console.log(`\n保存: scripts/utage-20260901-entries.json`);
