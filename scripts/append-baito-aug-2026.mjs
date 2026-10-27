// baito.json に 2026-08 を追加し、月次PL「人件費（バイト代）」へ反映
// 8月CSV(バイト生 武士道 振込 - 8月 R8.csv) 32名を全件手検証
// 事業判定:
//   genchi分 → 宮崎教室（全月共通ルール）
//   online分 → 担当生徒の事業で判定。複数事業にまたがる講師は人数比で按分
//   担当生徒の記載がない/体験生で特定できない場合は白谷塾オンライン
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const R8 = { 宮崎教室: "33588258-2d8c-8172-a026-f20baacea13a", 白谷塾オンライン: "33588258-2d8c-8160-ac00-d9a18a0238ed", ローカルメディ: "33588258-2d8c-81ce-8737-dbf973eca362" };
const DRY = process.argv.includes("--dry");
const YM = "2026-08";

// online: { 事業: 金額 } / genchi: 宮崎教室へ計上
const REC = [
  { name: "工藤仁一朗",  online: { 白谷塾オンライン: 650 },                            genchi: 0,     students: 1, note: "0.5h。髙宮世蓮=白谷オン(体験)" },
  { name: "家根原宗佑",  online: { 白谷塾オンライン: 15400, ローカルメディ: 15400 },      genchi: 5200,  students: 2, note: "兼。現地4h5200。オンライン30800を志岐るいか(LM)/芹澤ゆうま(英検→白谷)で折半" },
  { name: "中野修治",    online: { ローカルメディ: 18200 },                            genchi: 0,     students: 2, note: "14h。長嶺剛史/相場紫帆=LM" },
  { name: "林舞玲",      online: { 白谷塾オンライン: 15200 },                          genchi: 0,     students: 1, note: "担当費10000+4h5200。萩原宗義=英検→白谷" },
  { name: "桑室泰享",    online: { ローカルメディ: 32500 },                            genchi: 0,     students: 4, note: "担当費10000+面談13h19500+生徒対応2h3000。全員LM" },
  { name: "内田悠太",    online: { 白谷塾オンライン: 28000 },                          genchi: 0,     students: 3, note: "担当費10000+9h18000。高木あずさ/山名凜香=白谷オン" },
  { name: "塩田英資",    online: { 白谷塾オンライン: 41600 },                          genchi: 0,     students: 2, note: "担当費20000+16h21600。北崎由真/谷野理絵(英検)=白谷" },
  { name: "村田裕紀",    online: { ローカルメディ: 53500 },                            genchi: 0,     students: 1, note: "新規面談2人3000+27h40500+担当費10000。岩崎まりな=LM" },
  { name: "甲斐康成",    online: { 白谷塾オンライン: 3900 },                           genchi: 10400, students: 0, note: "兼・新人。現地8h10400。オンライン=面接+初回説明3h3900。担当生徒なし→講師DB要追加" },
  { name: "湯淺祥平",    online: { 白谷塾オンライン: 44800 },                          genchi: 0,     students: 3, note: "担当費+26h33800。川口朔=白谷オン。今月は現地0" },
  { name: "門脇孔明",    online: { 白谷塾オンライン: 38200 },                          genchi: 0,     students: 2, note: "担当費20000+14h18200。藤村百音/結城景太(英検)=白谷" },
  { name: "佐野心音",    online: { 白谷塾オンライン: 34830 },                          genchi: 0,     students: 1, note: "19h10m。現地欄に同じ時間が誤記入されているがオンライン分。石田莉羽=白谷オン" },
  { name: "矢田部勘介",  online: { ローカルメディ: 33400 },                            genchi: 0,     students: 2, note: "内訳金額の記載なし(合計のみ)。永岡璃子/一将冴=LM" },
  { name: "堤香代子",    online: { 白谷塾オンライン: 37745 },                          genchi: 0,     students: 2, note: "担当費20000+11.65h15145+添削2h2600。大高陽夢/山下彌耶乃(英検)=白谷" },
  { name: "黒木ひかり",  online: {},                                                  genchi: 3900,  students: 0, note: "現地のみ。書類送付作業3h" },
  { name: "有川悠斗",    online: {},                                                  genchi: 15600, students: 0, note: "現地のみ12h" },
  { name: "清水省吾",    online: {},                                                  genchi: 1950,  students: 0, note: "打ち合わせ1.5h。現地欄記入のため宮崎計上" },
  { name: "原崇一朗",    online: { 白谷塾オンライン: 1950 },                           genchi: 0,     students: 1, note: "zoom MTG1.5h。岡田紗也加=白谷" },
  { name: "弓削カノン",  online: { 白谷塾オンライン: 14300 },                          genchi: 0,     students: 2, note: "11h。劉美温(英検)=白谷。講師DB未登録→要追加" },
  { name: "帯刀勇人",    online: { 白谷塾オンライン: 1950 },                           genchi: 0,     students: 1, note: "打ち合わせ30分+計画面談1h。高井夏稀=体験生・事業未確定→白谷暫定" },
  { name: "松下飛海",    online: { 白谷塾オンライン: 23000 },                          genchi: 0,     students: 1, note: "担当費10000+5.5h7150+準備4.5h5850。岡本裕=白谷オン" },
  { name: "梶加衣人",    online: { 白谷塾オンライン: 34950 },                          genchi: 0,     students: 2, note: "担当費20000+11.5h14950。前田和樹/中島悠翔=白谷オン" },
  { name: "清水元貴",    online: { ローカルメディ: 15781 },                            genchi: 0,     students: 3, note: "6h46m8796+教材費6985。体験生3名→LM(7月踏襲)" },
  { name: "片岡駿晴",    online: { ローカルメディ: 10400 },                            genchi: 0,     students: 1, note: "8h。永岡璃子=LM" },
  { name: "大許真菜",    online: { 白谷塾オンライン: 76800 },                          genchi: 0,     students: 3, note: "担当費30000+36h46800。高瀬朋香/加納早彩/秋山蒼空=白谷オン。兼だが現地0" },
  { name: "善野真太郎",  online: { 白谷塾オンライン: 20400 },                          genchi: 0,     students: 2, note: "担当費10000+8h10400。高木憩/中山蒼衣=白谷" },
  { name: "藤山航",      online: { ローカルメディ: 64500 },                            genchi: 0,     students: 3, note: "担当費30000+23h34500。大沢はるき/猪股千紘/藤光真奈=LM" },
  { name: "柳沼寿明",    online: { 白谷塾オンライン: 52021 },                          genchi: 0,     students: 3, note: "担当費30000+10h2m13021+紹介費9000。結城/柾/谷端(英検)=白谷" },
  { name: "山内碧泉",    online: { 白谷塾オンライン: 11000, ローカルメディ: 5500 },      genchi: 0,     students: 3, note: "5h6500+担当費10000。小牧悠/野手聡一郎=白谷、志岐瑠香=LM → 2:1で按分。今月は現地0" },
  { name: "中山みさ",    online: {},                                                  genchi: 16250, students: 0, note: "現地のみ。掃除・事務12.5h" },
  { name: "竹内壮吾",    online: { 白谷塾オンライン: 12600 },                          genchi: 0,     students: 1, note: "担当費10000+2h2600。猪本剛大=体験生・事業未確定→白谷暫定" },
  { name: "岩田泉樹",    online: { ローカルメディ: 2720 },                             genchi: 0,     students: 1, note: "2h。中川陽翔=LM" },
  // ↓ 追加提出分（2026-09-01 受領）
  { name: "伊地知隼",    online: { 白谷塾オンライン: 108000 },                         genchi: 26000, students: 3, note: "兼。現地20h26,000。オンライン=担当費30,000＋60h78,000。長嶺克紀/米須清諒=白谷オン、劉美温(英検)=白谷" },
  { name: "田代汀",      online: {},                                                  genchi: 97700, students: 0, note: "現地51h66,300＋編集バイト31,400(5分以内×8本8,000/15分6h7,800/39分15h15,600)。7月同様すべて宮崎計上" },
  { name: "水元心春",    online: { 白谷塾オンライン: 7770 },                           genchi: 2600,  students: 1, note: "チラシ配り2,600は宮崎。担当費14日分4,520＋オンライン2,600＋端数。担当生徒「にこさん」が両DBに見当たらず白谷暫定" },
];

const CSV_TOTAL = 1056567; // CSVの合計金額列の総和（35名・追加提出分を含む）
const bizMonth = {};
let grand = 0;
for (const r of REC) {
  const onlineTotal = Object.values(r.online).reduce((a, b) => a + b, 0);
  grand += onlineTotal + r.genchi;
  for (const [b, v] of Object.entries(r.online)) bizMonth[b] = (bizMonth[b] ?? 0) + v;
  if (r.genchi > 0) bizMonth["宮崎教室"] = (bizMonth["宮崎教室"] ?? 0) + r.genchi;
}
if (grand !== CSV_TOTAL) { console.error(`合計不一致: ${grand} != ${CSV_TOTAL}`); process.exit(1); }

console.log(`=== 2026-08 バイト代 (${REC.length}名 / 合計 ¥${grand.toLocaleString()}) ${DRY ? "【DRY RUN】" : ""} ===`);
for (const [b, t] of Object.entries(bizMonth).sort((a, b) => b[1] - a[1])) console.log(`  ${b.padEnd(9)} ¥${t.toLocaleString()}`);

// baito.json 更新
const path = "src/data/baito.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));
data.records = data.records.filter((r) => r.ym !== YM);
data.businessMonth = data.businessMonth.filter((r) => r.ym !== YM);
for (const r of REC) {
  const onlineTotal = Object.values(r.online).reduce((a, b) => a + b, 0);
  const primary = Object.entries(r.online).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "宮崎教室";
  data.records.push({ name: r.name, ym: YM, business: primary, total: onlineTotal + r.genchi,
    online: onlineTotal, genchi: r.genchi, students: r.students, allDone: true, hasIncomplete: false, breakdownText: r.note });
}
for (const [business, total] of Object.entries(bizMonth)) data.businessMonth.push({ business, ym: YM, total });
data.records.sort((a, b) => (a.name !== b.name ? a.name.localeCompare(b.name, "ja") : a.ym.localeCompare(b.ym)));
data.businessMonth.sort((a, b) => (a.ym !== b.ym ? a.ym.localeCompare(b.ym) : a.business.localeCompare(b.business, "ja")));
if (!DRY) fs.writeFileSync(path, JSON.stringify(data, null, 2));

// Notion 月次PL 反映
const TAG = "8月バイトCSV取込(35名・追加提出分反映) → 人件費(バイト代)";
for (const [biz, amount] of Object.entries(bizMonth)) {
  const r = await notion.dataSources.query({ data_source_id: DS_PL, filter: { and: [{ property: "対象月", date: { equals: `${YM}-01` } }, { property: "事業-年度", relation: { contains: R8[biz] } }] }, page_size: 1 });
  const page = r.results[0];
  if (!page) { console.log(`  ! ${biz}: ${YM} のレコードなし`); continue; }
  const prev = page.properties["人件費（バイト代）"]?.number ?? 0;
  const hist = page.properties["アップロード履歴"]?.rich_text?.map((t) => t.plain_text).join("") ?? "";
  if (hist.includes(TAG)) { console.log(`  ⏭ ${biz}: 反映済み`); continue; }
  console.log(`  ${DRY ? "would set" : "set"} ${biz.padEnd(9)} 人件費(バイト代) ¥${prev.toLocaleString()} → ¥${amount.toLocaleString()}`);
  if (DRY) continue;
  const ts = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  await notion.pages.update({ page_id: page.id, properties: {
    "人件費（バイト代）": { number: amount },
    "アップロード履歴": { rich_text: [{ text: { content: [hist, `${ts} ${TAG}: ${biz} ¥${prev.toLocaleString()}→¥${amount.toLocaleString()}`].filter(Boolean).join("\n") } }] },
  }});
}
console.log(DRY ? "\nDRY RUN 完了" : "\n完了");
