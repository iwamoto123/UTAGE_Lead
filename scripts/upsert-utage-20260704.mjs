// 2026-07-04 UTAGE 新規リードを Notion 日次リード数DB に upsert
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";
const DAILY_DS = "ff6be008-cddc-42ef-831f-9b327e056635";

const LABELS = {
  "PjocL14v2u6j|yyog9fvedOtP": "再受験/メタ広告",
  "PjocL14v2u6j|V98BSMwhViZC": "再受験/面談予約",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "再受験/YouTube",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "熊大特化/メタ広告",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "熊大特化/面談予約",
  "Tm32etw7epfS|fpZvVLcMvLMK": "九州高1高2/メタ広告",
  "Tm32etw7epfS|NidcrIoR9Aqi": "九州高1高2/面談予約",
  "n99EYdMfgwxy|VJHxg3hQn8qy": "総体後/メタ広告",
  "n99EYdMfgwxy|zZe1kylB5Nfr": "総体後/面談予約",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "地方医学部/YouTube動画",
  "TZq4ob5n4GZ1|TZq4_YT_DESC": "地方医学部/YouTube概要欄",
  "TZq4ob5n4GZ1|TZq4_YT_POST": "地方医学部/YouTube投稿",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS": "地方医学部/Threads",
  "TZq4ob5n4GZ1|TZq4_SNS_X": "地方医学部/X",
  "TZq4ob5n4GZ1|TZq4_SNS_IG": "地方医学部/Instagram",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK": "地方医学部/TikTok",
  "TZq4ob5n4GZ1|TZq4_STANDFM": "地方医学部/SNS StandFM",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "地方医学部/HPブログ",
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE": "地方医学部/HP UTAGE",
  "TZq4ob5n4GZ1|TZq4_META_REUSE": "地方医学部/メタ広告(合流)再受験",
  "TZq4ob5n4GZ1|TZq4_META_K12": "地方医学部/メタ広告(合流)高1高2",
  "TZq4ob5n4GZ1|TZq4_UNK": "地方医学部/トラッキング無し",
};

// Notion 最新日付 (check-notion-utage-per-scenario.mjs 実行結果より)
const LATEST = {
  "PjocL14v2u6j|yyog9fvedOtP": "2026-07-02",
  "PjocL14v2u6j|V98BSMwhViZC": "2026-07-03",
  "PjocL14v2u6j|ss0Y2tqzi9hW": "2026-06-28",
  "7qQJ38rzLtbM|XAz7XmBFO3yX": "2026-06-10",
  "7qQJ38rzLtbM|OQu9St8wqN9R": "2026-05-19",
  "Tm32etw7epfS|fpZvVLcMvLMK": "2026-06-13",
  "Tm32etw7epfS|NidcrIoR9Aqi": "2026-05-26",
  "n99EYdMfgwxy|VJHxg3hQn8qy": "2026-06-13",
  "n99EYdMfgwxy|zZe1kylB5Nfr": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_YT_VIDEO": "2026-06-27",
  "TZq4ob5n4GZ1|TZq4_YT_DESC": "2026-02-24",
  "TZq4ob5n4GZ1|TZq4_YT_POST": "2026-04-30",
  "TZq4ob5n4GZ1|TZq4_SNS_THREADS": "2025-11-06",
  "TZq4ob5n4GZ1|TZq4_SNS_X": "2026-01-11",
  "TZq4ob5n4GZ1|TZq4_SNS_IG": "2026-05-03",
  "TZq4ob5n4GZ1|TZq4_SNS_TIKTOK": "2025-09-03",
  "TZq4ob5n4GZ1|TZq4_STANDFM": "1970-01-01",
  "TZq4ob5n4GZ1|TZq4_HP_BLOG": "2026-06-15",
  "TZq4ob5n4GZ1|TZq4_HP_UTAGE": "2026-06-30",
  "TZq4ob5n4GZ1|TZq4_META_REUSE": "2026-06-29",
  "TZq4ob5n4GZ1|TZq4_META_K12": "2026-06-13",
  "TZq4ob5n4GZ1|TZq4_UNK": "2026-06-07",
};

const TODAY = "2026-07-04";

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
  if (mtn.includes("HP掲載用")) return "TZq4_HP_UTAGE";
  if (mtn.includes("YouTube概要欄")) return "TZq4_YT_DESC";
  if (mtn.includes("YouTube投稿")) return "TZq4_YT_POST";
  return "TZq4_YT_VIDEO";
}

function loadResult(path) {
  const wrap = JSON.parse(fs.readFileSync(path, "utf8"));
  return JSON.parse(wrap[0].text).data;
}

// ============================================================
// ファイル保存された大型レスポンス
// ============================================================
const YYOG_P1 = loadResult("/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/aa9de70a-32d7-4bb9-808a-34c8200e60ca/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1783124170450.txt");
const TZQ4_P1 = loadResult("/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/aa9de70a-32d7-4bb9-808a-34c8200e60ca/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1783124182069.txt");
const TZQ4_P2 = loadResult("/Users/takeshi/.claude/projects/-Users-takeshi-workspace-works-pl-dashboard/aa9de70a-32d7-4bb9-808a-34c8200e60ca/tool-results/mcp-claude_ai_UTAGE-message_reader_list_all-1783124207335.txt");

// ============================================================
// インライン: yyog p2 (40件) — 全て 2026-04-21 以前なので LATEST 2026-07-02 以降は該当なし
// → yyog は p1 のみで十分。念のため p2 は空とみなす
// ============================================================

// ============================================================
// V98 (44件): 2026-07-03 以降のみ = 1件
// ============================================================
const V98 = [
  "2026-07-03", "2026-06-29", "2026-06-28", "2026-06-20", "2026-06-16", "2026-06-16",
  "2026-06-14", "2026-06-13", "2026-06-13", "2026-06-13", "2026-06-12", "2026-06-09",
  "2026-06-08", "2026-06-07", "2026-06-05", "2026-06-04", "2026-06-03",
  "2026-05-30", "2026-05-27", "2026-05-24", "2026-05-22", "2026-05-18", "2026-05-18",
  "2026-05-12", "2026-05-09", "2026-05-07", "2026-05-05", "2026-05-04", "2026-05-02", "2026-05-01",
  "2026-04-24", "2026-04-23", "2026-04-22", "2026-04-22", "2026-04-21", "2026-04-20",
  "2026-04-20", "2026-04-20", "2026-04-18", "2026-04-17", "2026-04-16", "2026-04-14",
  "2026-04-12", "2026-04-12",
];
// ss0 (6件)
const SS0 = ["2026-06-28", "2026-06-08", "2026-05-26", "2026-05-18", "2026-05-17", "2026-05-12"];
// XAz7 (17件)
const XAZ = [
  "2026-06-10", "2026-06-09", "2026-06-05", "2026-06-04", "2026-06-04", "2026-06-02",
  "2026-05-26", "2026-05-21", "2026-05-20", "2026-05-19", "2026-05-18", "2026-05-18",
  "2026-05-13", "2026-05-12", "2026-05-11", "2026-05-10", "2026-05-09",
];
// OQu (1件)
const OQU = ["2026-05-19"];
// fpZ (8件)
const FPZ = [
  "2026-06-13", "2026-05-28", "2026-05-24", "2026-05-21", "2026-05-21",
  "2026-05-19", "2026-05-19", "2026-05-19",
];
// Nid (2件)
const NID = ["2026-05-26", "2026-05-19"];
// VJH (13件): メインの公式LINEから は集計外
const VJH = [
  ["2026-06-13", null], ["2026-06-13", null], ["2026-06-12", null],
  ["2026-06-08", null], ["2026-06-08", "メインの公式LINEから"],
  ["2026-06-07", "メインの公式LINEから"], ["2026-06-07", "メインの公式LINEから"],
  ["2026-06-07", null], ["2026-06-07", "メインの公式LINEから"], ["2026-06-07", null],
  ["2026-06-07", null], ["2026-06-07", null], ["2026-06-07", null],
];
// zZe (3件)
const ZZE = ["2026-06-13", "2026-06-08", "2026-06-07"];

// TZq4 p3 (28件): [base_date, message_tracking_name]
const TZQ4_P3 = [
  ["2025-09-03", "Xプロフィールから"],
  ["2025-08-28", "5/9【香川大学医学科】推薦の「志望理由書」と「面接」対策の進め方！【準備が9割！医学科受験の推薦入試】"],
  ["2025-08-16", "Threadsプロフィールから"],
  ["2025-08-10", null],
  ["2025-08-09", "5/19【医学科受験の失敗談!?】ラ・サール高校から2浪を経験した医学科生の反省点とは!?【久留米大学医学科】"],
  ["2025-08-04", "Threadsプロフィールから"],
  ["2025-08-03", "Threadsプロフィールから"],
  ["2025-07-31", "Xプロフィールから"],
  ["2025-07-28", "Xプロフィールから"],
  ["2025-07-25", "【知られざる】国際医療福祉大学医学科の合格の極意とは!?【傾向と対策】"],
  ["2025-07-25", "Instagramプロフィールから"],
  ["2025-07-23", "Xプロフィールから"],
  ["2025-07-23", "Xプロフィールから"],
  ["2025-07-07", "5/20【1日のスケジュール】猛勉強して医学科現役合格【医学科なのにプログラミング!? 日本大学医学科生の合格体験談】"],
  ["2025-06-25", null],
  ["2025-06-21", "4/29【九州大学医学科受験】「数学」「英語」の高1から受験までの勉強法【宮崎大学医学科 後期 主席】"],
  ["2025-06-11", null],
  ["2025-06-04", "5/23【私大医学科のレベルとは】久留米大学医学科の理科の傾向と対策【久留米医 化学・物理編】"],
  ["2025-05-23", null],
  ["2025-05-22", "4.22【医学部再受験】10年ぶりの受験で1年で産業医科大合格✨4月で5割→最終8割🔥【再受験生の合格の秘訣とは！？】"],
  ["2025-05-20", "4/26【九大医学科A判定】高1・高2で「学年1位」を取り続けた驚きの勉強法とは！？【後期 宮崎大学医学科 主席】"],
  ["2025-05-19", "4.22【医学部再受験】10年ぶりの受験で1年で産業医科大合格✨4月で5割→最終8割🔥【再受験生の合格の秘訣とは！？】"],
  ["2025-05-06", "4/18【開成→愛媛大医学科】参考書ルート📚開成高校から留学して浪人した受験生の参考書リストを徹底解説【数学・英語・化学・物理ルート】"],
  ["2025-05-04", "4/29【九州大学医学科受験】「数学」「英語」の高1から受験までの勉強法【宮崎大学医学科 後期 主席】"],
  ["2025-05-03", "4/29【九州大学医学科受験】「数学」「英語」の高1から受験までの勉強法【宮崎大学医学科 後期 主席】"],
  ["2025-04-20", "4/18【開成→愛媛大医学科】参考書ルート📚開成高校から留学して浪人した受験生の参考書リストを徹底解説【数学・英語・化学・物理ルート】"],
  ["2025-04-20", null],
  ["2025-04-15", null],
];

const result = {};
function add(key, date) {
  if (date > TODAY) return;
  if (!result[key]) result[key] = {};
  result[key][date] = (result[key][date] ?? 0) + 1;
}

for (const r of YYOG_P1) add("PjocL14v2u6j|yyog9fvedOtP", r.base_date.slice(0, 10));
for (const d of V98) add("PjocL14v2u6j|V98BSMwhViZC", d);
for (const d of SS0) add("PjocL14v2u6j|ss0Y2tqzi9hW", d);
for (const d of XAZ) add("7qQJ38rzLtbM|XAz7XmBFO3yX", d);
for (const d of OQU) add("7qQJ38rzLtbM|OQu9St8wqN9R", d);
for (const d of FPZ) add("Tm32etw7epfS|fpZvVLcMvLMK", d);
for (const d of NID) add("Tm32etw7epfS|NidcrIoR9Aqi", d);
for (const [d, mtn] of VJH) {
  if (mtn === "メインの公式LINEから") continue;
  add("n99EYdMfgwxy|VJHxg3hQn8qy", d);
}
for (const d of ZZE) add("n99EYdMfgwxy|zZe1kylB5Nfr", d);

for (const r of [...TZQ4_P1, ...TZQ4_P2]) {
  const v = classifyTZq4(r.message_tracking_name);
  add(`TZq4ob5n4GZ1|${v}`, r.base_date.slice(0, 10));
}
for (const [d, mtn] of TZQ4_P3) {
  const v = classifyTZq4(mtn);
  add(`TZq4ob5n4GZ1|${v}`, d);
}

console.log("=== 全aggregation結果 (直近10件) ===");
for (const [key, daily] of Object.entries(result)) {
  console.log(`${key}:`, Object.entries(daily).sort().slice(-10).map(([d,c]) => `${d}=${c}`).join(", "));
}

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

console.log("\n=== 各 (acc|sce) の latest以降 ===");
for (const [key, daily] of Object.entries(filtered)) {
  console.log(`  ${key.padEnd(40)} latest=${LATEST[key]}:`, daily);
}

async function loadMasters() {
  const map = new Map();
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: SOURCE_DS, start_cursor: cursor, page_size: 100 });
    for (const p of res.results) {
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      map.set(`${a}|${s}`, p.id);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return map;
}

async function loadExisting() {
  const map = new Map();
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100 });
    for (const p of res.results) {
      const d = p.properties["日付"]?.date?.start ?? "";
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      const n = p.properties["新規読者数"]?.number ?? 0;
      map.set(`${d}|${a}|${s}`, { id: p.id, count: n });
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return map;
}

const masters = await loadMasters();
const existing = await loadExisting();
console.log(`\n流入経路マスター: ${masters.size}件 / 既存日次: ${existing.size}件\n`);

let created = 0, updated = 0, skipped = 0, noop = 0;
for (const [key, daily] of Object.entries(filtered)) {
  const [acc, sce] = key.split("|");
  const label = LABELS[key] ?? key;
  const masterId = masters.get(key);
  if (!masterId) { console.log(`! マスター未登録: ${label} (${key})`); skipped++; continue; }

  for (const [date, count] of Object.entries(daily)) {
    const ek = `${date}|${acc}|${sce}`;
    const props = {
      "名前": { title: [{ text: { content: `${date} ${label}` } }] },
      "日付": { date: { start: date } },
      "流入経路": { relation: [{ id: masterId }] },
      "新規読者数": { number: count },
      "UTAGEアカウントID": { rich_text: [{ text: { content: acc } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: sce } }] },
    };
    const ex = existing.get(ek);
    if (ex) {
      if (ex.count === count) {
        console.log(`= no-op: ${date} ${label} (count=${count})`);
        noop++;
      } else {
        await notion.pages.update({ page_id: ex.id, properties: props });
        console.log(`↑ updated: ${date} ${label} ${ex.count}→${count}`);
        updated++;
      }
    } else {
      await notion.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
      console.log(`+ created: ${date} ${label} =${count}`);
      created++;
    }
  }
}

console.log(`\n結果: 新規=${created} / 更新=${updated} / no-op=${noop} / skipped=${skipped}`);
