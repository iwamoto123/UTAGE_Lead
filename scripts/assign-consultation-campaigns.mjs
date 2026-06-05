// R8 面談・体験生徒DB の 流入企画 を確実な18件分セット
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const CONSULTATION_DS = "e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb";

// キャンペーンID
const C = {
  REUSE_LM:        "a6467fd0-d74f-464a-ba05-87490c3b77b6", // 再受験生 無料面談（ローカルメディ）
  K12_LM:          "deeafea3-8a1d-4930-bb06-38dc18272bba", // 高1高2 無料Zoom相談（ローカルメディ）
  NEW_HS1_LM:      "33088258-2d8c-816a-99d4-fcb1c9e0e046", // ローカルメディ 新高1
  KUMA:            "017954b7-b020-4ac5-a1f4-bbee2d907a8c", // 熊本大学特化 個別相談
  SHINKEN:         "33088258-2d8c-819d-bd26-c8850cd207d8", // 進研模試対策プログラム
  START_DASH:      "33088258-2d8c-814a-b74c-dbe86486e3f6", // スタートダッシュプログラム
  HARU_HS3:        "33088258-2d8c-8141-8e91-d8355d1707ef", // 春期講習（高校3年生向け）
};

// 確実な紐付け (名前 → キャンペーンID)
const ASSIGNMENTS = [
  // Tm32 (ローカルメディ九州 高1高2)
  { name: "永岡璃子", campaignId: C.K12_LM, reason: "母 永岡真由美 Tm32 5/19 登録" },
  { name: "コルソンジョシュア匡", campaignId: C.K12_LM, reason: "母 Yasuyo Coulson Tm32 4/22 登録" },
  // PjocL (再受験コース)
  { name: "足立健人", campaignId: C.REUSE_LM, reason: "PjocL 4/20" },
  { name: "森本世理子", campaignId: C.REUSE_LM, reason: "PjocL 4/16" },
  { name: "遠藤香織", campaignId: C.REUSE_LM, reason: "PjocL 4/14" },
  { name: "可世木美帆", campaignId: C.REUSE_LM, reason: "PjocL 4/18" },
  { name: "與那覇朝子", campaignId: C.REUSE_LM, reason: "PjocL 4/12" },
  { name: "伊藤綾音", campaignId: C.REUSE_LM, reason: "PjocL 4/21" },
  { name: "西川翔", campaignId: C.REUSE_LM, reason: "PjocL 4/20" },
  { name: "永井梨沙", campaignId: C.REUSE_LM, reason: "PjocL 5/4" },
  { name: "森本浩通", campaignId: C.REUSE_LM, reason: "PjocL 4/24" },
  { name: "城間一輝", campaignId: C.REUSE_LM, reason: "PjocL 4/17" },
  { name: "猪股千紘", campaignId: C.REUSE_LM, reason: "前回確認 千紘さん→入塾" },
  // Cj6 (新高1春講座)
  { name: "古川巧航", campaignId: C.NEW_HS1_LM, reason: "前回確認 古川さん→新高1春講座から入塾" },
  // xVM (1月進研模試)
  { name: "中島悠翔", campaignId: C.SHINKEN, reason: "前回確認 xVM 1月進研模試から入塾" },
  { name: "矢崎幹人", campaignId: C.SHINKEN, reason: "前回確認 xVM 1月進研模試から入塾" },
  // NpJ (2月スタートダッシュ)
  { name: "秋山蒼空", campaignId: C.START_DASH, reason: "前回確認 NpJ 2月スタートダッシュから入塾" },
  // rOY (春期講習)
  { name: "藤村百音", campaignId: C.HARU_HS3, reason: "前回確認 rOY 春期講習から入塾" },
];

// 全件取得して name → pageId をマップ
const rows = [];
let cursor;
do {
  const res = await notion.dataSources.query({ data_source_id: CONSULTATION_DS, start_cursor: cursor, page_size: 100 });
  rows.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

// 名前正規化(空白/全角空白除去)で一致
function norm(s) { return s.replace(/[\s　]/g, ""); }
const pageByName = new Map();
for (const p of rows) {
  const name = p.properties["名前"]?.title?.map(t => t.plain_text).join("") ?? "";
  pageByName.set(norm(name), { id: p.id, displayName: name });
}

let updated = 0, notFound = 0;
for (const a of ASSIGNMENTS) {
  const entry = pageByName.get(norm(a.name));
  if (!entry) {
    console.log(`! 未検出: ${a.name}`);
    notFound++;
    continue;
  }
  await notion.pages.update({
    page_id: entry.id,
    properties: {
      "流入企画": { relation: [{ id: a.campaignId }] },
    },
  });
  console.log(`+ ${entry.displayName.padEnd(15)} → ${a.reason}`);
  updated++;
}

console.log(`\n完了: 更新 ${updated}件 / 未検出 ${notFound}件`);
