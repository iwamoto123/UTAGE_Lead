// baito.json に 2026-06 の講師別バイト記録を追加
// 6月CSV(バイト生 武士道 振込 - 6月 R8.csv)を手検証して確定した内訳
// 重複行 除外: 村田ひろき(=村田裕紀の再提出/裕紀35500が正), 中山みさ(2重提出→1回)
// 事業判定: online分は講師所属事業(ローカルメディ講師DBで照合), genchi分は宮崎教室
import fs from "fs";

const YM = "2026-06";
// name, business(online計上先), online, genchi, students, note
const REC = [
  { name: "岩田泉樹",   business: "白谷塾オンライン", online: 1950,   genchi: 15600, students: 1, note: "兼(新規/未登録講師)" },
  { name: "家根原宗佑", business: "白谷塾オンライン", online: 42505,  genchi: 7800,  students: 2, note: "兼" },
  { name: "村田裕紀",   business: "ローカルメディ",   online: 35500,  genchi: 0,     students: 1, note: "村田ひろき(26500)は同一人物の再提出→除外" },
  { name: "片岡駿晴",   business: "ローカルメディ",   online: 15600,  genchi: 0,     students: 1, note: "" },
  { name: "桑室泰享",   business: "ローカルメディ",   online: 30000,  genchi: 0,     students: 3, note: "" },
  { name: "梶加衣人",   business: "白谷塾オンライン", online: 15200,  genchi: 0,     students: 1, note: "" },
  { name: "矢田部勘介", business: "ローカルメディ",   online: 28225,  genchi: 0,     students: 1, note: "" },
  { name: "山内碧泉",   business: "白谷塾オンライン", online: 34050,  genchi: 9100,  students: 1, note: "兼(現地5200+その他3900)" },
  { name: "清水元貴",   business: "ローカルメディ",   online: 1875,   genchi: 0,     students: 1, note: "" },
  { name: "佐野心音",   business: "白谷塾オンライン", online: 20695,  genchi: 0,     students: 1, note: "" },
  { name: "大許真菜",   business: "白谷塾オンライン", online: 74200,  genchi: 0,     students: 3, note: "兼だが現地0" },
  { name: "湯淺祥平",   business: "白谷塾オンライン", online: 34700,  genchi: 18850, students: 1, note: "兼" },
  { name: "塩田英資",   business: "ローカルメディ",   online: 22150,  genchi: 0,     students: 1, note: "" },
  { name: "門脇孔明",   business: "白谷塾オンライン", online: 34300,  genchi: 0,     students: 2, note: "" },
  { name: "宮本諒人",   business: "白谷塾オンライン", online: 3900,   genchi: 0,     students: 0, note: "動画撮影/MTG(新規/未登録講師)" },
  { name: "中山みさ",   business: "宮崎教室",         online: 0,      genchi: 47450, students: 0, note: "2重提出→1回計上" },
  { name: "有川悠斗",   business: "白谷塾オンライン", online: 0,      genchi: 7800,  students: 0, note: "現地のみ" },
  { name: "伊地知隼",   business: "白谷塾オンライン", online: 20800,  genchi: 10400, students: 2, note: "兼" },
  { name: "藤山航",     business: "ローカルメディ",   online: 116888, genchi: 0,     students: 6, note: "" },
  { name: "田代汀",     business: "宮崎教室",         online: 0,      genchi: 80600, students: 0, note: "現地のみ" },
];

const path = "src/data/baito.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));
data.records = data.records.filter(r => r.ym !== YM);
data.businessMonth = data.businessMonth.filter(r => r.ym !== YM);

const bizMonth = {};
for (const r of REC) {
  const total = r.online + r.genchi;
  data.records.push({
    name: r.name, ym: YM, business: r.business, total,
    online: r.online, genchi: r.genchi, students: r.students,
    allDone: true, hasIncomplete: false,
    breakdownText: r.note || "",
  });
  // online分 → 講師所属事業 / genchi分 → 宮崎教室
  if (r.online > 0) bizMonth[r.business] = (bizMonth[r.business] ?? 0) + r.online;
  if (r.genchi > 0) bizMonth["宮崎教室"] = (bizMonth["宮崎教室"] ?? 0) + r.genchi;
}
for (const [business, total] of Object.entries(bizMonth)) {
  data.businessMonth.push({ business, ym: YM, total });
}

data.records.sort((a, b) => a.name !== b.name ? a.name.localeCompare(b.name, "ja") : a.ym.localeCompare(b.ym));
data.businessMonth.sort((a, b) => a.ym !== b.ym ? a.ym.localeCompare(b.ym) : a.business.localeCompare(b.business, "ja"));

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("=== 2026-06 事業別バイト代 (businessMonth) ===");
for (const [b, t] of Object.entries(bizMonth)) console.log(`  ${b}: ¥${t.toLocaleString()}`);
console.log(`  合計: ¥${Object.values(bizMonth).reduce((a,b)=>a+b,0).toLocaleString()}`);
console.log(`\n${REC.length} 名分を baito.json に追加`);
