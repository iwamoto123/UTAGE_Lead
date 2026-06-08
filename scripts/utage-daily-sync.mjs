#!/usr/bin/env node
// UTAGE → Notion 日次同期
//
// 環境変数:
//   UTAGE_API_TOKEN: UTAGE管理画面 → API設定 から取得した Bearer トークン
//   NOTION_TOKEN:    Notion Integration トークン
//
// 動作:
//   1. アクティブな (account, scenario) のリストを定義
//   2. UTAGE API でリーダー一覧を取得 (per scenario)
//   3. Notion 日次リード数DB の最新日付以降のリーダーを抽出
//   4. (date, account, scenario) 別に集計し upsert
//   5. TZq4 通年シナリオは message_tracking_name で 仮想シナリオに分割

import { Client } from "@notionhq/client";

const NOTION = new Client({ auth: process.env.NOTION_TOKEN });
const UTAGE_TOKEN = process.env.UTAGE_API_TOKEN;
const UTAGE_BASE = process.env.UTAGE_API_BASE ?? "https://online.shiratanijuku.com/api/v1";
console.log(`UTAGE_BASE=${UTAGE_BASE}`);
console.log(`UTAGE_TOKEN=${UTAGE_TOKEN ? UTAGE_TOKEN.slice(0, 8) + "..." : "(none)"}`);
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";
const DAILY_DS = "ff6be008-cddc-42ef-831f-9b327e056635";

if (!UTAGE_TOKEN) { console.error("UTAGE_API_TOKEN 未設定"); process.exit(1); }
if (!process.env.NOTION_TOKEN) { console.error("NOTION_TOKEN 未設定"); process.exit(1); }

// active な (account, scenario) リスト
const ACTIVE = [
  { acc: "PjocL14v2u6j", sce: "yyog9fvedOtP", label: "再受験/メタ広告" },
  { acc: "PjocL14v2u6j", sce: "V98BSMwhViZC", label: "再受験/面談予約" },
  { acc: "PjocL14v2u6j", sce: "ss0Y2tqzi9hW", label: "再受験/YouTube" },
  { acc: "7qQJ38rzLtbM", sce: "XAz7XmBFO3yX", label: "熊大特化/メタ広告" },
  { acc: "7qQJ38rzLtbM", sce: "OQu9St8wqN9R", label: "熊大特化/面談予約" },
  { acc: "Tm32etw7epfS", sce: "fpZvVLcMvLMK", label: "九州高1高2/メタ広告" },
  { acc: "Tm32etw7epfS", sce: "NidcrIoR9Aqi", label: "九州高1高2/面談予約" },
  { acc: "TZq4ob5n4GZ1", sce: "9lF9qbjgG5a8", label: "地方医学部/通年", splitByMtn: true },
  { acc: "n99EYdMfgwxy", sce: "VJHxg3hQn8qy", label: "総体後/メタ広告", excludeInternal: true },
  { acc: "n99EYdMfgwxy", sce: "zZe1kylB5Nfr", label: "総体後/面談予約" },
];

// TZq4 message_tracking_name → 仮想シナリオID マッピング
function classifyTzq4(mtn) {
  if (!mtn) return { sce: "TZq4_UNK", label: "(不明)" };
  if (mtn.includes("再受験コースのメタ広告から")) return { sce: "TZq4_META_REUSE", label: "メタ広告(合流)再受験" };
  if (mtn.includes("高1 高2 お試しキャンペーンから")) return { sce: "TZq4_META_K12", label: "メタ広告(合流)高1高2" };
  if (mtn.includes("Threadsプロフィール")) return { sce: "TZq4_SNS_THREADS", label: "SNS: Threads" };
  if (mtn.includes("Xプロフィール")) return { sce: "TZq4_SNS_X", label: "SNS: X" };
  if (mtn.includes("Instagramプロフィール")) return { sce: "TZq4_SNS_IG", label: "SNS: Instagram" };
  if (mtn.includes("TikTokのプロフィール")) return { sce: "TZq4_SNS_TIKTOK", label: "SNS: TikTok" };
  if (mtn.includes("StandFM")) return { sce: "TZq4_STANDFM", label: "SNS: StandFM" };
  if (mtn.includes("ブログ")) return { sce: "TZq4_HP_BLOG", label: "HP/ブログ" };
  if (mtn.includes("音声・記事のページ")) return { sce: "TZq4_HP_UTAGE", label: "HP/UTAGE記事" };
  if (mtn.includes("YouTube概要欄")) return { sce: "TZq4_YT_DESC", label: "YouTube: 概要欄" };
  if (mtn.includes("YouTube投稿")) return { sce: "TZq4_YT_POST", label: "YouTube: 投稿機能" };
  return { sce: "TZq4_YT_VIDEO", label: "YouTube: 動画" }; // 動画タイトル系
}

// UTAGE API: シナリオ別リーダー全件取得
// 試行する認証ヘッダー方式を順次トライ
const AUTH_VARIANTS = [
  { name: "Bearer", apply: (h) => { h.Authorization = `Bearer ${UTAGE_TOKEN}`; } },
  { name: "X-API-Key", apply: (h) => { h["X-API-Key"] = UTAGE_TOKEN; } },
  { name: "api-key", apply: (h) => { h["api-key"] = UTAGE_TOKEN; } },
];
let workingAuth = null;

// エンドポイントパターン候補
const ENDPOINT_PATTERNS = [
  (acc, sce, page) => `/messages/readers?account_id=${acc}&scenario_id=${sce}&page=${page}&per_page=100`,
  (acc, sce, page) => `/message_reader_list_all?account_id=${acc}&scenario_id=${sce}&page=${page}&per_page=100`,
  (acc, sce, page) => `/messages/${acc}/readers?scenario_id=${sce}&page=${page}&per_page=100`,
  (acc, sce, page) => `/messages/readers/all?account_id=${acc}&scenario_id=${sce}&page=${page}&per_page=100`,
  (acc, sce, page) => `/reader/list_all?account_id=${acc}&scenario_id=${sce}&page=${page}&per_page=100`,
  (acc, sce, page) => `/readers?account_id=${acc}&scenario_id=${sce}&page=${page}&per_page=100`,
];
let workingPattern = null;

async function fetchReaders(accountId, scenarioId) {
  const all = [];
  let page = 1;
  while (true) {
    let res, lastErr, matchedUrl;
    const patterns = workingPattern ? [workingPattern] : ENDPOINT_PATTERNS;
    const variants = workingAuth ? [workingAuth] : AUTH_VARIANTS;
    outer: for (const pat of patterns) {
      const url = `${UTAGE_BASE}${pat(accountId, scenarioId, page)}`;
      matchedUrl = url;
      for (const v of variants) {
        const headers = { Accept: "application/json" };
        v.apply(headers);
        res = await fetch(url, { headers });
        if (res.ok) { workingAuth = v; workingPattern = pat; break outer; }
        lastErr = `${v.name}: ${res.status}`;
      }
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`UTAGE API failed (all patterns) ${lastErr} lastUrl=${matchedUrl} body=${body.slice(0, 200)}`);
    }
    const json = await res.json();
    all.push(...(json.data ?? []));
    if ((json.data ?? []).length < 100) break;
    page++;
    if (page > 50) break;
  }
  return all;
}

// 起動時にベースURLの疎通確認
async function probeBase() {
  console.log(`\n[probe] ${UTAGE_BASE}`);
  for (const path of ["", "/", "/health", "/docs", "/openapi.json", "/messages/accounts", "/accounts"]) {
    try {
      const url = `${UTAGE_BASE}${path}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${UTAGE_TOKEN}`, Accept: "application/json" } });
      const body = (await res.text()).slice(0, 100);
      console.log(`  ${res.status} ${url} :: ${body.replace(/\n/g, " ")}`);
    } catch (e) { console.log(`  ERR ${path}: ${e.message}`); }
  }
  console.log("");
}

// 既存マスター取得 (acc|sce → master_page_id)
async function loadMasters() {
  const map = new Map();
  let cursor;
  do {
    const res = await NOTION.dataSources.query({ data_source_id: SOURCE_DS, start_cursor: cursor, page_size: 100 });
    for (const p of res.results) {
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      map.set(`${a}|${s}`, p.id);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return map;
}

// 既存日次レコード取得 + アカウント別最新日付
async function loadExisting() {
  const map = new Map(); // (date|acc|sce) → page_id
  const latestByAcc = new Map(); // acc → latest YYYY-MM-DD
  let cursor;
  do {
    const res = await NOTION.dataSources.query({ data_source_id: DAILY_DS, start_cursor: cursor, page_size: 100 });
    for (const p of res.results) {
      const d = p.properties["日付"]?.date?.start ?? "";
      const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
      const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
      map.set(`${d}|${a}|${s}`, p.id);
      if (a && d > (latestByAcc.get(a) ?? "")) latestByAcc.set(a, d);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return { map, latestByAcc };
}

// 集計: リーダー配列 → 日別カウント
function aggregateDaily(readers, fromDate) {
  const counts = new Map();
  for (const r of readers) {
    const d = (r.base_date ?? "").slice(0, 10);
    if (!d || d < fromDate) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return counts;
}

// main
(async () => {
  await probeBase();
  const masters = await loadMasters();
  const { map: existing, latestByAcc } = await loadExisting();
  console.log(`マスター ${masters.size}件 / 既存日次 ${existing.size}件`);

  let created = 0, updated = 0, skipped = 0, errored = 0;

  for (const entry of ACTIVE) {
    const since = latestByAcc.get(entry.acc) ?? "2026-01-01";
    console.log(`\n■ ${entry.label} (${entry.acc}/${entry.sce}) since=${since}`);

    let readers;
    try {
      readers = await fetchReaders(entry.acc, entry.sce);
    } catch (e) {
      console.error(`  UTAGE取得失敗: ${e.message}`);
      errored++;
      continue;
    }

    // 通年シナリオは仮想シナリオに分割
    if (entry.splitByMtn) {
      const byVirt = new Map(); // virtSce → { label, counts }
      for (const r of readers) {
        const d = (r.base_date ?? "").slice(0, 10);
        if (!d || d <= since) continue;
        const c = classifyTzq4(r.message_tracking_name);
        if (!byVirt.has(c.sce)) byVirt.set(c.sce, { label: c.label, counts: new Map() });
        const v = byVirt.get(c.sce);
        v.counts.set(d, (v.counts.get(d) ?? 0) + 1);
      }
      for (const [virtSce, v] of byVirt) {
        const masterId = masters.get(`${entry.acc}|${virtSce}`);
        if (!masterId) { console.log(`    ! マスター未登録 ${virtSce}`); skipped++; continue; }
        for (const [date, count] of v.counts) {
          await upsertDaily(masterId, entry.acc, virtSce, date, count, `${entry.label}/${v.label}`, existing);
        }
      }
    } else {
      const masterId = masters.get(`${entry.acc}|${entry.sce}`);
      if (!masterId) { console.log(`  ! マスター未登録`); skipped++; continue; }
      const counts = aggregateDaily(readers, since); // since 含めて再集計→既存上書きで安全
      for (const [date, count] of counts) {
        if (date <= since) continue;
        await upsertDaily(masterId, entry.acc, entry.sce, date, count, entry.label, existing);
      }
    }
  }

  async function upsertDaily(masterId, acc, sce, date, count, label, existing) {
    const props = {
      "名前": { title: [{ text: { content: `${date} ${label}` } }] },
      "日付": { date: { start: date } },
      "流入経路": { relation: [{ id: masterId }] },
      "新規読者数": { number: count },
      "UTAGEアカウントID": { rich_text: [{ text: { content: acc } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: sce } }] },
    };
    const key = `${date}|${acc}|${sce}`;
    if (existing.has(key)) {
      await NOTION.pages.update({ page_id: existing.get(key), properties: props });
      console.log(`    ~ ${date} ${count}`);
      updated++;
    } else {
      await NOTION.pages.create({ parent: { data_source_id: DAILY_DS }, properties: props });
      console.log(`    + ${date} ${count}`);
      created++;
    }
  }

  console.log(`\n完了: 新規${created} / 更新${updated} / スキップ${skipped} / エラー${errored}`);
  if (errored > 0) process.exit(1);
})();
