// baito.json に 2026-07 の講師別バイト記録を追加
// 7月CSV(バイト生 武士道 振込 - 7月 R8.csv) 28名を手検証して確定した内訳
// 事業判定:
//   genchi分 → 宮崎教室（全月共通ルール）
//   online分 → 担当生徒の事業-年度で判定。生徒記載がない行のみ講師DB所属で判定
//   ※7月は講師DB所属と担当生徒の事業がズレる講師が5名いたため生徒基準を優先
//     林舞玲/塩田英資/善野真太郎/堤香代子（LM講師だが担当生徒は白谷オン）
//     岩田泉樹（白谷講師だが担当生徒 中川陽翔 はローカルメディ）
import fs from "fs";

const YM = "2026-07";
// name, business(online計上先), online, genchi, students, note
const REC = [
  { name: "門脇孔明",   business: "白谷塾オンライン", online: 33000, genchi: 0,     students: 2, note: "担当費20000+オンライン授業10h13000" },
  { name: "内田悠太",   business: "白谷塾オンライン", online: 18500, genchi: 0,     students: 3, note: "担当費10000+4h15m。生徒 髙木あずさ/田中杏=白谷オン" },
  { name: "有川悠斗",   business: "白谷塾オンライン", online: 0,     genchi: 3900,  students: 0, note: "現地のみ 3h" },
  { name: "桑室泰享",   business: "ローカルメディ",   online: 64500, genchi: 0,     students: 4, note: "担当費10000+教材執筆20000+面談11h+生徒対応10h+事務2h" },
  { name: "林舞玲",     business: "白谷塾オンライン", online: 3900,  genchi: 0,     students: 1, note: "LM講師DB所属だが担当生徒 荻原宗義=白谷オン" },
  { name: "柳沼寿明",   business: "ローカルメディ",   online: 7083,  genchi: 0,     students: 0, note: "授業方法説明50分1083+紹介費2人6000。生徒記載なし→講師DB判定" },
  { name: "村田裕紀",   business: "ローカルメディ",   online: 55750, genchi: 0,     students: 1, note: "面談5.5h8250+作業25h37500+担当費10000" },
  { name: "梶加衣人",   business: "白谷塾オンライン", online: 24300, genchi: 0,     students: 2, note: "担当費10000+作業11h14300" },
  { name: "家根原宗佑", business: "白谷塾オンライン", online: 45930, genchi: 10400, students: 3, note: "兼。現地8h10400。オンライン=担当費10000+24h31200+参考書代4730" },
  { name: "片岡駿晴",   business: "ローカルメディ",   online: 9100,  genchi: 0,     students: 1, note: "作業3900+指導5200。生徒 永岡璃子=LM" },
  { name: "横山未帆",   business: "ローカルメディ",   online: 1000,  genchi: 0,     students: 0, note: "LINE打ち合わせ40分。生徒記載なし→講師DB判定" },
  { name: "佐野心音",   business: "白谷塾オンライン", online: 31345, genchi: 0,     students: 1, note: "内訳金額の記載なし(合計のみ)" },
  { name: "塩田英資",   business: "白谷塾オンライン", online: 25600, genchi: 0,     students: 2, note: "LM講師DB所属だが担当生徒 北崎由真=白谷オン。担当費10000+12h15600" },
  { name: "善野真太郎", business: "白谷塾オンライン", online: 3250,  genchi: 0,     students: 1, note: "LM講師DB所属だが担当生徒 髙木憩=白谷オン" },
  { name: "松下飛海",   business: "白谷塾オンライン", online: 30189, genchi: 0,     students: 2, note: "担当費20000+5.5h7150+準備1.5h1950+教材費1089" },
  { name: "黒木ひかり", business: "白谷塾オンライン", online: 7150,  genchi: 0,     students: 1, note: "講師DB未登録。担当生徒 古川徳明=白谷オン → 要 講師DB追加" },
  { name: "清水元貴",   business: "ローカルメディ",   online: 17446, genchi: 0,     students: 5, note: "作業11.1h14430+教材費3016" },
  { name: "田代汀",     business: "宮崎教室",         online: 0,     genchi: 89850, students: 0, note: "現地64.5h83850+編集バイト6000" },
  { name: "伊地知隼",   business: "白谷塾オンライン", online: 55900, genchi: 32500, students: 6, note: "兼。現地25h32500+オンライン43h55900" },
  { name: "中山みさ",   business: "宮崎教室",         online: 0,     genchi: 50700, students: 0, note: "現地のみ(SNS作業/書類スキャン/授業/印刷)" },
  { name: "山内碧泉",   business: "白谷塾オンライン", online: 32100, genchi: 3900,  students: 3, note: "兼。現地3h3900。オンライン=担当費10000+17h22100" },
  { name: "矢田部勘介", business: "ローカルメディ",   online: 26875, genchi: 0,     students: 2, note: "内訳金額の記載なし(合計のみ)" },
  { name: "中野修治",   business: "ローカルメディ",   online: 5850,  genchi: 0,     students: 3, note: "作業4.5h5850" },
  { name: "堤香代子",   business: "白谷塾オンライン", online: 7982,  genchi: 0,     students: 2, note: "LM講師DB所属だが担当生徒 大高はるむ/藤谷華音=白谷オン。作業3h10m4116+添削866+講師紹介3000" },
  { name: "藤山航",     business: "ローカルメディ",   online: 97375, genchi: 0,     students: 5, note: "担当費40000+38.25h57375" },
  { name: "湯淺祥平",   business: "白谷塾オンライン", online: 11000, genchi: 43550, students: 1, note: "兼。現地指導19h24700+現地14.5h18850。オンラインは担当費のみ" },
  { name: "岩田泉樹",   business: "ローカルメディ",   online: 13000, genchi: 0,     students: 1, note: "白谷講師DB所属だが担当生徒 中川陽翔=LM。作業10h13000" },
  { name: "大許真菜",   business: "白谷塾オンライン", online: 78750, genchi: 0,     students: 3, note: "兼だが現地0。担当費30000+37.5h48750" },
];

const path = "src/data/baito.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));
data.records = data.records.filter((r) => r.ym !== YM);
data.businessMonth = data.businessMonth.filter((r) => r.ym !== YM);

const bizMonth = {};
for (const r of REC) {
  const total = r.online + r.genchi;
  data.records.push({
    name: r.name, ym: YM, business: r.business, total,
    online: r.online, genchi: r.genchi, students: r.students,
    allDone: true, hasIncomplete: false,
    breakdownText: r.note || "",
  });
  if (r.online > 0) bizMonth[r.business] = (bizMonth[r.business] ?? 0) + r.online;
  if (r.genchi > 0) bizMonth["宮崎教室"] = (bizMonth["宮崎教室"] ?? 0) + r.genchi;
}
for (const [business, total] of Object.entries(bizMonth)) {
  data.businessMonth.push({ business, ym: YM, total });
}

data.records.sort((a, b) => (a.name !== b.name ? a.name.localeCompare(b.name, "ja") : a.ym.localeCompare(b.ym)));
data.businessMonth.sort((a, b) => (a.ym !== b.ym ? a.ym.localeCompare(b.ym) : a.business.localeCompare(b.business, "ja")));

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("=== 2026-07 事業別バイト代 (businessMonth) ===");
for (const [b, t] of Object.entries(bizMonth)) console.log(`  ${b}: ¥${t.toLocaleString()}`);
console.log(`  合計: ¥${Object.values(bizMonth).reduce((a, b) => a + b, 0).toLocaleString()}`);
console.log(`\n${REC.length} 名分を baito.json に追加`);
