// TZq4ob5n4GZ1 (地方医学部オンライン塾) 通年シナリオ194名を
// message_tracking_name で分類して仮想シナリオ別 日次集計を生成
import fs from "fs";

const page1 = JSON.parse(fs.readFileSync("/tmp/tzq4_page1.json", "utf8")).data;
const page2 = JSON.parse(fs.readFileSync("/tmp/tzq4_page2.json", "utf8")).data;
const readers = [...page1, ...page2];
console.log(`total: ${readers.length}`);

// 分類ルール
function classify(mtn) {
  if (!mtn) return { virtSce: "TZq4_UNK", virtName: "(不明) 公式LINE等", category: "公式LINE" };
  if (mtn.includes("再受験コースのメタ広告から")) return { virtSce: "TZq4_META_REUSE", virtName: "メタ広告(合流): 再受験コース", category: "メタ広告(合流)" };
  if (mtn.includes("高1 高2 お試しキャンペーンから")) return { virtSce: "TZq4_META_K12", virtName: "メタ広告(合流): 高1高2お試し", category: "メタ広告(合流)" };
  if (mtn.includes("Threadsプロフィール")) return { virtSce: "TZq4_SNS_THREADS", virtName: "SNS: Threads", category: "SNS自然流入" };
  if (mtn.includes("Xプロフィール")) return { virtSce: "TZq4_SNS_X", virtName: "SNS: X", category: "SNS自然流入" };
  if (mtn.includes("Instagramプロフィール")) return { virtSce: "TZq4_SNS_IG", virtName: "SNS: Instagram", category: "SNS自然流入" };
  if (mtn.includes("TikTokのプロフィール")) return { virtSce: "TZq4_SNS_TIKTOK", virtName: "SNS: TikTok", category: "SNS自然流入" };
  if (mtn.includes("ブログ記事")) return { virtSce: "TZq4_HP_BLOG", virtName: "HP/ブログ: 新HP記事", category: "HP/ブログ" };
  if (mtn.includes("音声・記事のページ")) return { virtSce: "TZq4_HP_UTAGE", virtName: "HP/ブログ: UTAGE記事", category: "HP/ブログ" };
  // YouTube動画タイトル系
  if (mtn.includes("YouTube概要欄")) return { virtSce: "TZq4_YT_DESC", virtName: "YouTube: 概要欄", category: "YouTube自然流入" };
  if (mtn.includes("YouTube投稿")) return { virtSce: "TZq4_YT_POST", virtName: "YouTube: 投稿機能", category: "YouTube自然流入" };
  // 動画タイトル (日付始まり or 大学名)
  return { virtSce: "TZq4_YT_VIDEO", virtName: "YouTube: 動画", category: "YouTube自然流入" };
}

// 集計: virtSce → { virtName, category, dailyCount }
const buckets = new Map();
for (const r of readers) {
  const c = classify(r.message_tracking_name);
  const date = r.base_date.slice(0, 10);
  if (!buckets.has(c.virtSce)) buckets.set(c.virtSce, { virtName: c.virtName, category: c.category, daily: {} });
  const b = buckets.get(c.virtSce);
  b.daily[date] = (b.daily[date] ?? 0) + 1;
}

console.log("\n=== カテゴリ別合計 ===");
const catTotal = {};
for (const [k, v] of buckets) {
  const t = Object.values(v.daily).reduce((s, n) => s + n, 0);
  catTotal[v.category] = (catTotal[v.category] ?? 0) + t;
  console.log(`  [${v.category}] ${k}: ${v.virtName} = ${t}名`);
}
console.log("\n=== カテゴリ合計 ===");
for (const [c, t] of Object.entries(catTotal)) console.log(`  ${c}: ${t}名`);
console.log(`  GRAND TOTAL: ${readers.length}`);

// 出力
const output = {
  account_id: "TZq4ob5n4GZ1",
  account_name: "地方医学部オンライン塾 ローカルメディ",
  business: "ローカルメディ",
  scenarios: [],
};
for (const [virtSce, v] of buckets) {
  output.scenarios.push({
    virt_scenario_id: virtSce,
    virt_scenario_name: v.virtName,
    category: v.category,
    daily: v.daily,
    total: Object.values(v.daily).reduce((s, n) => s + n, 0),
  });
}
fs.writeFileSync("scripts/tzq4-classified.json", JSON.stringify(output, null, 2));
console.log("\n出力: scripts/tzq4-classified.json");
