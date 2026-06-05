// 4アカウント (白谷塾R8公式 + 国語R8 + 物理2026 + 情報2026) を投入
// R8期 (2026-01以降) は日次、R7以前は月次集計
import { Client } from "@notionhq/client";
import fs from "fs";
import path from "path";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SOURCE_DS = "097f9138-25b4-450c-be98-b116973d59df";
const DAILY_DS = "ff6be008-cddc-42ef-831f-9b327e056635";
const R8_ONLINE = "335882582d8c8160ac00d9a18a0238ed";
const R7_ONLINE = "335882582d8c819ca109f95672dae188";

// ───── データ集計 ─────────────────────────────────────────────
// /tmp/*.json から base_date を抽出
function loadFromFiles(pattern) {
  const tmpDir = "/tmp";
  const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith(pattern) && f.endsWith(".json"));
  const dates = [];
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(tmpDir, f), "utf8"));
    for (const d of j.data) {
      dates.push((d.base_date || "").slice(0, 10));
    }
  }
  return dates.filter((d) => d);
}

function loadInline(key) {
  const inline = JSON.parse(fs.readFileSync("/tmp/inline_data.json", "utf8"));
  return inline[key]?.dates ?? [];
}

// シナリオごとの全 base_date
const SCENARIO_DATES = {
  // 75qj4QCIIFrE 白谷塾R8公式
  "75qj4QCIIFrE|b9w2rcMtohfk": loadFromFiles("tsunen_p"),
  "75qj4QCIIFrE|2CdkRG1QSJcf": loadFromFiles("kokugohanbai_p").concat(loadInline("2CdkRG1QSJcf_p3")),
  "75qj4QCIIFrE|jUKgUorIA3SG": loadInline("jUKgUorIA3SG"),

  // qN7MMxMWLx3n 国語R8
  "qN7MMxMWLx3n|HzupVPodqmDZ": loadFromFiles("kokugomein_p"),
  "qN7MMxMWLx3n|tntISiQXVvkD": loadFromFiles("kokugometa_p").concat(loadInline("tntISiQXVvkD_p4")),
  "qN7MMxMWLx3n|HTg2NhsPE4Z9": loadFromFiles("kokugo_kounyu"),
  "qN7MMxMWLx3n|YTVr7lx1O873": [], // 最後の案内 - 集計外として skip

  // y7hyqMysZhxd 物理2026
  "y7hyqMysZhxd|9rOiW32JSgpN": loadFromFiles("butsumein_p"),
  "y7hyqMysZhxd|fuWlRP6TIQOP": loadFromFiles("butsumeta_p").concat(loadInline("fuWlRP6TIQOP_p4")),
  "y7hyqMysZhxd|LO04dRfabCed": loadInline("LO04dRfabCed"),

  // 7oxtilRUXOBi 情報2026
  "7oxtilRUXOBi|hKbY9uPCSNkS": loadFromFiles("jouhomein_p"),
  "7oxtilRUXOBi|pWmunbC35ghr": loadInline("pWmunbC35ghr"),
};

// ───── シナリオ→カテゴリ・アカウント名・シナリオ名・年度マッピング ──────
const SCENARIO_META = {
  "75qj4QCIIFrE|b9w2rcMtohfk": { acc: "白谷塾オンライン教室【R8公式】", sce: "通年シナリオ→メインシナリオに合流させる", cat: "YouTube自然流入", year: "R8" },
  "75qj4QCIIFrE|2CdkRG1QSJcf": { acc: "白谷塾オンライン教室【R8公式】", sce: "国語の教材販売シナリオ", cat: "教材販売", year: "R8" },
  "75qj4QCIIFrE|jUKgUorIA3SG": { acc: "白谷塾オンライン教室【R8公式】", sce: "国語のテキスト購入者への2ヶ月 コンテンツ配信シナリオ", cat: "教材販売", year: "R8" },

  "qN7MMxMWLx3n|HzupVPodqmDZ": { acc: "国語 R8", sce: "メインシナリオ", cat: "YouTube自然流入", year: "MIXED" },
  "qN7MMxMWLx3n|tntISiQXVvkD": { acc: "国語 R8", sce: "国語メタ広告シナリオ", cat: "メタ広告", year: "MIXED" },
  "qN7MMxMWLx3n|HTg2NhsPE4Z9": { acc: "国語 R8", sce: "国語テキスト購入者シナリオ 令和7年度・令和8年度", cat: "教材販売", year: "MIXED" },

  "y7hyqMysZhxd|9rOiW32JSgpN": { acc: "物理2026", sce: "メインシナリオ", cat: "YouTube自然流入", year: "MIXED" },
  "y7hyqMysZhxd|fuWlRP6TIQOP": { acc: "物理2026", sce: "物理メタ広告シナリオ", cat: "メタ広告", year: "MIXED" },
  "y7hyqMysZhxd|LO04dRfabCed": { acc: "物理2026", sce: "物理テキスト購入者シナリオ", cat: "教材販売", year: "MIXED" },

  "7oxtilRUXOBi|hKbY9uPCSNkS": { acc: "情報2026", sce: "メインシナリオ", cat: "YouTube自然流入", year: "MIXED" },
  "7oxtilRUXOBi|pWmunbC35ghr": { acc: "情報2026", sce: "情報テキスト購入者シナリオ", cat: "教材販売", year: "MIXED" },
};

// 年度判定: R8期 = 2026-01以降, R7以前 = 2026-01未満
const R8_START = "2026-01-01";
function yearForDate(d) {
  return d >= R8_START ? "R8" : "R7";
}

// 日次バケット (R8期) / 月次バケット (R7以前) を生成
function aggregateDates(dates) {
  const dailyR8 = {};
  const monthlyR7 = {};
  for (const d of dates) {
    if (d >= R8_START) {
      dailyR8[d] = (dailyR8[d] ?? 0) + 1;
    } else {
      const ym = d.slice(0, 7) + "-01"; // 月初日付として保存
      monthlyR7[ym] = (monthlyR7[ym] ?? 0) + 1;
    }
  }
  return { dailyR8, monthlyR7 };
}

// ───── Notion 流入経路マスター 操作 ──────────────────────────
async function findMaster(accId, sceId) {
  const res = await notion.dataSources.query({
    data_source_id: SOURCE_DS,
    filter: { and: [
      { property: "UTAGEアカウントID", rich_text: { equals: accId } },
      { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
    ]},
    page_size: 1,
  });
  return res.results[0]?.id;
}

async function ensureMaster(accId, accName, sceId, sceName, category, yearRel) {
  let id = await findMaster(accId, sceId);
  if (id) {
    return id;
  }
  const res = await notion.pages.create({
    parent: { data_source_id: SOURCE_DS },
    properties: {
      "名前": { title: [{ text: { content: `${accName} / ${sceName}` } }] },
      "UTAGEアカウントID": { rich_text: [{ text: { content: accId } }] },
      "UTAGEアカウント名": { rich_text: [{ text: { content: accName } }] },
      "UTAGEシナリオID": { rich_text: [{ text: { content: sceId } }] },
      "UTAGEシナリオ名": { rich_text: [{ text: { content: sceName } }] },
      "経路カテゴリ": { select: { name: category } },
      "事業-年度": { relation: [{ id: yearRel }] },
      "集計対象": { checkbox: true },
    },
  });
  return res.id;
}

async function deleteScenarioDaily(accId, sceId) {
  let total = 0;
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DAILY_DS,
      filter: { and: [
        { property: "UTAGEアカウントID", rich_text: { equals: accId } },
        { property: "UTAGEシナリオID", rich_text: { equals: sceId } },
      ]},
      page_size: 100,
      start_cursor: cursor,
    });
    for (const p of res.results) {
      await notion.pages.update({ page_id: p.id, archived: true });
      total++;
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return total;
}

// ───── 実行 ──────────────────────────────────────────────────
for (const [key, dates] of Object.entries(SCENARIO_DATES)) {
  if (dates.length === 0) continue;
  const [accId, sceId] = key.split("|");
  const meta = SCENARIO_META[key];
  const { dailyR8, monthlyR7 } = aggregateDates(dates);

  // Master ensure (R8期主軸で 事業-年度=R8 で作成)
  const masterId = await ensureMaster(accId, meta.acc, sceId, meta.sce, meta.cat, R8_ONLINE);
  const deleted = await deleteScenarioDaily(accId, sceId);
  console.log(`\n=== ${meta.acc} / ${meta.sce} [${meta.cat}] ===`);
  console.log(`  期間内合計: ${dates.length}件 (R8日次=${Object.keys(dailyR8).length}日 / R7月次=${Object.keys(monthlyR7).length}月)`);
  console.log(`  旧削除: ${deleted}件`);

  let created = 0;
  // R8期: 日次レコード
  for (const [d, count] of Object.entries(dailyR8)) {
    await notion.pages.create({
      parent: { data_source_id: DAILY_DS },
      properties: {
        "名前": { title: [{ text: { content: `${d} ${meta.acc}/${meta.sce}` } }] },
        "日付": { date: { start: d } },
        "流入経路": { relation: [{ id: masterId }] },
        "新規読者数": { number: count },
        "UTAGEアカウントID": { rich_text: [{ text: { content: accId } }] },
        "UTAGEシナリオID": { rich_text: [{ text: { content: sceId } }] },
      },
    });
    created++;
  }
  // R7期: 月次レコード (月初日付で保存)
  for (const [d, count] of Object.entries(monthlyR7)) {
    await notion.pages.create({
      parent: { data_source_id: DAILY_DS },
      properties: {
        "名前": { title: [{ text: { content: `${d.slice(0,7)} (月次) ${meta.acc}/${meta.sce}` } }] },
        "日付": { date: { start: d } },
        "流入経路": { relation: [{ id: masterId }] },
        "新規読者数": { number: count },
        "UTAGEアカウントID": { rich_text: [{ text: { content: accId } }] },
        "UTAGEシナリオID": { rich_text: [{ text: { content: sceId } }] },
      },
    });
    created++;
  }
  console.log(`  新規追加: ${created}件`);
}

console.log("\n完了");
