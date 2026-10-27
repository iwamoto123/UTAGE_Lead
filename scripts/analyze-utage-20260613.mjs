// TZq4 通年シナリオを message_tracking_name で分類し、各仮想シナリオごとに Notion 最新日付より新しいレコードを抽出
import fs from "fs";

const PAGE1 = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/247120f1-904c-4484-8e46-a1d131ffac86/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1781309073192.txt";
const PAGE2 = "/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/247120f1-904c-4484-8e46-a1d131ffac86/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1781309160750.txt";

function loadPage(p) {
  const wrap = JSON.parse(fs.readFileSync(p, "utf8"));
  return JSON.parse(wrap[0].text).data;
}

const page3 = JSON.parse(fs.readFileSync("/tmp/tzq4_page3.json", "utf8")).data;
const all = [...loadPage(PAGE1), ...loadPage(PAGE2), ...page3];
console.log(`TZq4 total: ${all.length}`);

function classify(mtn) {
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

const LATEST = {
  TZq4_YT_VIDEO: "2026-06-11",
  TZq4_YT_DESC: "2026-02-24",
  TZq4_YT_POST: "2026-04-30",
  TZq4_SNS_THREADS: "2025-11-06",
  TZq4_SNS_X: "2026-01-11",
  TZq4_SNS_IG: "2026-05-03",
  TZq4_SNS_TIKTOK: "2025-09-03",
  TZq4_HP_BLOG: "2026-05-30",
  TZq4_HP_UTAGE: "2025-11-28",
  TZq4_META_REUSE: "2026-06-09",
  TZq4_META_K12: "2026-05-26",
  TZq4_UNK: "2026-06-07",
};

const buckets = {};
for (const r of all) {
  const v = classify(r.message_tracking_name);
  const date = r.base_date.slice(0, 10);
  if (date <= LATEST[v]) continue;
  if (!buckets[v]) buckets[v] = {};
  buckets[v][date] = (buckets[v][date] ?? 0) + 1;
}

console.log("\n=== 新規 (Notion 最新日付より後) ===");
for (const [v, daily] of Object.entries(buckets)) {
  console.log(`  ${v} (latest=${LATEST[v]}):`, daily);
}
