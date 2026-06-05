// 4アカウントの message_tracking_name 集計
// 出力: scripts/utage-tracking-totals.json (既存に追記)
import fs from "fs";
import path from "path";

const TMP = "/tmp";

function loadDataFromPattern(pattern) {
  const files = fs.readdirSync(TMP).filter((f) => f.startsWith(pattern) && f.endsWith(".json"));
  const records = [];
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(TMP, f), "utf8"));
    for (const r of (j.data ?? [])) {
      if (r.message_tracking_name !== undefined || r.line_display_name !== undefined) {
        records.push(r);
      }
    }
  }
  return records;
}

// 種別判定
function classifyTrackingName(name) {
  if (!name || name.trim() === "") return "不明";
  const s = String(name);
  if (s.includes("YouTube概要欄") || s.includes("YouTube紹介欄") || s.includes("YouTube投稿") || s.includes("YouTubeチャンネル")) return "YouTube";
  if (s.includes("Threadsプロフィール") || s.includes("Xプロフィール") || s.includes("Instagramプロフィール") || s.includes("TikTokのプロフィール")) return "SNS投稿";
  if (s.includes("メタ広告から")) return "他LINE誘導"; // 「再受験コースのメタ広告から」等 = 別アカウント誘導
  if (s.includes("お試しキャンペーンから")) return "他LINE誘導";
  if (s.includes("ブログ記事") || s.includes("音声・記事") || s.includes("HPから")) return "他LINE誘導";
  if (s.includes("公式LINE") || s.includes("LINEから") || s.includes("LINE追加")) return "他LINE誘導";
  if (s.includes("以前購入してくださった人") || s.includes("最後にメイン") || s.includes("R7 最後")) return "他LINE誘導";
  if (s.includes("決済後サンクスページ用")) return "他LINE誘導";
  if (s.includes("メインチャンネル")) return "YouTube"; // YouTubeのメインチャンネル
  // それ以外は YouTube動画タイトルと推定 (日付・大学名・【】など)
  return "YouTube";
}

function aggregate(records) {
  const counts = new Map();
  for (const r of records) {
    const raw = r.message_tracking_name;
    const name = (raw === null || raw === undefined || raw === "") ? "(空)" : raw;
    const type = classifyTrackingName(raw);
    const key = `${name}|${type}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const list = [...counts.entries()]
    .map(([k, count]) => {
      const idx = k.lastIndexOf("|");
      return { name: k.slice(0, idx), type: k.slice(idx + 1), count };
    })
    .sort((a, b) => b.count - a.count);
  return list;
}

const SCENARIOS = [
  {
    account_id: "PjocL14v2u6j",
    scenario_id: "yyog9fvedOtP",
    account_name: "【再受験コース】医学部塾ローカルメディ",
    scenario_name: "メタ広告シナリオ 【再受験コース】医学部塾ローカルメディ",
    category: "メタ広告",
    pattern: "saijuken_meta",
    forceType: "メタ広告", // シナリオ自体がメタ広告経由なので、内訳は1行にまとめる
    forceLabel: "(メタ広告から直接登録)",
  },
  {
    account_id: "PjocL14v2u6j",
    scenario_id: "ss0Y2tqzi9hW",
    account_name: "【再受験コース】医学部塾ローカルメディ",
    scenario_name: "YouTubeシナリオ 【再受験コース】医学部塾ローカルメディ",
    category: "YouTube自然流入",
    pattern: "saijuken_youtube",
  },
  {
    account_id: "qN7MMxMWLx3n",
    scenario_id: "HzupVPodqmDZ",
    account_name: "国語 R8 (教材販売)",
    scenario_name: "メインシナリオ",
    category: "YouTube自然流入",
    pattern: "kokugomein_p",
  },
  {
    account_id: "qN7MMxMWLx3n",
    scenario_id: "tntISiQXVvkD",
    account_name: "国語 R8 (教材販売)",
    scenario_name: "国語メタ広告シナリオ",
    category: "メタ広告",
    pattern: "kokugometa_p",
  },
  {
    account_id: "y7hyqMysZhxd",
    scenario_id: "9rOiW32JSgpN",
    account_name: "物理2026 (教材販売)",
    scenario_name: "メインシナリオ",
    category: "YouTube自然流入",
    pattern: "butsumein_p",
  },
  {
    account_id: "y7hyqMysZhxd",
    scenario_id: "fuWlRP6TIQOP",
    account_name: "物理2026 (教材販売)",
    scenario_name: "物理メタ広告シナリオ",
    category: "メタ広告",
    pattern: "butsumeta_p",
  },
  {
    account_id: "7oxtilRUXOBi",
    scenario_id: "hKbY9uPCSNkS",
    account_name: "情報2026 (教材販売)",
    scenario_name: "メインシナリオ",
    category: "YouTube自然流入",
    pattern: "jouhomein_p",
  },
];

const out = [];
for (const s of SCENARIOS) {
  const records = loadDataFromPattern(s.pattern);
  let trackings;
  let total;
  if (s.forceType) {
    // シナリオ全体を1つの type にまとめる
    total = records.length;
    trackings = [{ name: s.forceLabel ?? "(集計対象)", type: s.forceType, count: total }];
  } else {
    trackings = aggregate(records);
    total = trackings.reduce((sum, t) => sum + t.count, 0);
  }
  console.log(`${s.scenario_name} (${s.account_name}): ${total}件 / ${trackings.length}種`);
  out.push({
    account_id: s.account_id,
    scenario_id: s.scenario_id,
    account_name: s.account_name,
    scenario_name: s.scenario_name,
    category: s.category,
    total,
    trackings,
  });
}

// 既存JSONに追記
const targetPath = "/Users/takeshi/workspace/works/pl-dashboard/scripts/utage-tracking-totals.json";
const existing = JSON.parse(fs.readFileSync(targetPath, "utf8"));
const existingKeys = new Set(existing.scenarios.map((s) => `${s.account_id}|${s.scenario_id}`));
for (const s of out) {
  const k = `${s.account_id}|${s.scenario_id}`;
  if (existingKeys.has(k)) {
    // 既存を置き換え
    const idx = existing.scenarios.findIndex((x) => `${x.account_id}|${x.scenario_id}` === k);
    existing.scenarios[idx] = s;
  } else {
    existing.scenarios.push(s);
  }
}
existing._fetched_at = new Date().toISOString().slice(0, 10);
fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2) + "\n");
console.log(`\n✓ ${targetPath} を更新 (${existing.scenarios.length} scenarios)`);
