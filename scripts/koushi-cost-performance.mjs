// 8月バイトCSVの担当生徒 × 塾生DBの月謝 → 講師別のコストパフォーマンス
import fs from "fs";
const juku = JSON.parse(fs.readFileSync("outputs/jukusei-detail.json", "utf8"));
const norm = (s) => (s ?? "").replace(/[\s　・、,]/g, "").replace(/くん|さん|君/g, "");
const byName = new Map(); for (const j of juku) byName.set(norm(j.name), j);
// かな・略称の対応表（CSVの表記 → 塾生DBの氏名）
const ALIAS = {
  "髙宮世蓮": null, "志岐るいか": "志岐瑠香", "芹澤ゆうま": "芹澤悠真", "長嶺": "長嶺剛史", "相場": "相場紫帆",
  "荻原宗義": "荻原宗義", "和田かずひろ": null, "あずささん": "髙木あずさ", "りんかさん": "山名凜香", "あんさん": null,
  "山内りんか": "山名凜香", "北崎由真": "北崎由真", "谷野理絵": "谷野理絵", "岩崎まりな": "岩崎まりな",
  "川口朔くん": "川口朔はじめ", "ももねさん": "藤村百音", "けいたくん": "服部恵大", "服部恵大": "服部恵大", "石田莉羽": "石田莉羽",
  "永岡璃子": "永岡璃子", "一将冴": "一 将冴（はじめ しょうご）", "大高はるむ君": "大高陽夢", "山下ややのさん": "山下彌耶乃",
  "岡田沙也加": null, "劉美温さん": "劉 美温", "高井夏稀": null, "岡本祐さん": "岡本祐", "前田和樹くん": "前田和樹",
  "中島悠翔くん": "中島悠翔", "ねいさん": null, "えりさん": null, "鈴木さん": null,
  "高瀬朋香さん": "高瀬朋香", "加納早彩さん": "加納早彩", "秋山蒼空さん": "秋山蒼空",
  "たかぎいこい": "髙木憩", "なかやまあおい": null, "大沢はるき": "大沢はるき", "千紘ちひろ": "猪股千紘", "藤光真奈": "藤光真奈",
  "結城景太さん": "結城景太", "柾亜弥さん": "柾亜弥", "谷端紗綾さん": "谷端紗綾",
  "小牧はる": "小牧悠", "るいか": "志岐瑠香", "野手聡一郎": "野手聡一郎", "いのもとたけひろくん": null, "中川陽翔": "中川陽翔",
  "にこさん": null, "長嶺克紀": "長嶺克紀", "米須清諒": "米須清諒", "劉美温": "劉 美温",
};
function lookup(raw) {
  const k = raw.trim(); if (!k) return null;
  if (k in ALIAS) { const a = ALIAS[k]; return a ? byName.get(norm(a)) ?? null : null; }
  return byName.get(norm(k)) ?? null;
}
// 講師: [支払総額, オンライン分, 現地分, 担当生徒(CSV表記)]
const KOUSHI = [
  ["工藤仁一朗", 650, 650, 0, ["髙宮世蓮"]],
  ["家根原宗佑", 36000, 30800, 5200, ["志岐るいか", "芹澤ゆうま"]],
  ["中野修治", 18200, 18200, 0, ["長嶺", "相場"]],
  ["林舞玲", 15200, 15200, 0, ["荻原宗義"]],
  ["桑室泰享", 32500, 32500, 0, ["相場紫帆", "長嶺剛史", "和田かずひろ", "内田 櫻子"]],
  ["内田悠太", 28000, 28000, 0, ["あずささん", "りんかさん", "あんさん"]],
  ["塩田英資", 41600, 41600, 0, ["北崎由真", "谷野理絵"]],
  ["村田裕紀", 53500, 53500, 0, ["岩崎まりな"]],
  ["甲斐康成", 14300, 3900, 10400, []],
  ["湯淺祥平", 44800, 44800, 0, ["川口朔くん"]],
  ["門脇孔明", 38200, 38200, 0, ["ももねさん", "服部恵大"]],
  ["佐野心音", 34830, 34830, 0, ["石田莉羽"]],
  ["矢田部勘介", 33400, 33400, 0, ["永岡璃子", "一将冴"]],
  ["堤香代子", 37745, 37745, 0, ["大高はるむ君", "山下ややのさん"]],
  ["黒木ひかり", 3900, 0, 3900, []],
  ["有川悠斗", 15600, 0, 15600, []],
  ["清水省吾", 1950, 0, 1950, []],
  ["原崇一朗", 1950, 1950, 0, ["岡田沙也加"]],
  ["弓削カノン", 14300, 14300, 0, ["劉美温さん"]],
  ["帯刀勇人", 1950, 1950, 0, ["高井夏稀"]],
  ["松下飛海", 23000, 23000, 0, ["岡本祐さん"]],
  ["梶加衣人", 34950, 34950, 0, ["前田和樹くん", "中島悠翔くん"]],
  ["清水元貴", 15781, 15781, 0, ["ねいさん", "えりさん", "鈴木さん"]],
  ["片岡駿晴", 10400, 10400, 0, ["永岡璃子"]],
  ["大許真菜", 76800, 76800, 0, ["高瀬朋香さん", "加納早彩さん", "秋山蒼空さん"]],
  ["善野真太郎", 20400, 20400, 0, ["たかぎいこい", "なかやまあおい"]],
  ["藤山航", 64500, 64500, 0, ["大沢はるき", "千紘ちひろ", "藤光真奈"]],
  ["柳沼寿明", 52021, 52021, 0, ["結城景太さん", "柾亜弥さん", "谷端紗綾さん"]],
  ["山内碧泉", 16500, 16500, 0, ["小牧はる", "るいか", "野手聡一郎"]],
  ["中山みさ", 16250, 0, 16250, []],
  ["竹内壮吾", 12600, 12600, 0, ["いのもとたけひろくん"]],
  ["岩田泉樹", 2720, 2720, 0, ["中川陽翔"]],
  ["伊地知隼", 134000, 108000, 26000, ["長嶺克紀", "米須清諒", "劉美温"]],
  ["田代汀", 97700, 0, 97700, []],
  ["水元心春", 10370, 7770, 2600, ["にこさん"]],
];
const rows = [];
for (const [name, total, online, genchi, studs] of KOUSHI) {
  const matched = studs.map(s => ({ raw: s, j: lookup(s) }));
  const gessha = matched.reduce((a, m) => a + (m.j?.gessha ?? 0), 0);
  rows.push({ name, total, online, genchi, studs: matched, gessha, ratio: gessha > 0 ? online / gessha : null,
    unmatched: matched.filter(m => !m.j).map(m => m.raw) });
}
const yen = (n) => "¥" + n.toLocaleString();
console.log("=== 講師別コストパフォーマンス（2026-08） ===");
console.log("講師".padEnd(12) + "支払額".padStart(10) + "うちオンライン".padStart(13) + "担当生徒の月謝計".padStart(16) + "人件費率".padStart(10) + "  担当生徒");
for (const r of rows.filter(r => r.online > 0).sort((a, b) => (b.ratio ?? 99) - (a.ratio ?? 99))) {
  console.log(r.name.padEnd(12) + yen(r.total).padStart(10) + yen(r.online).padStart(13) +
    (r.gessha ? yen(r.gessha) : "−").padStart(16) + (r.ratio != null ? (r.ratio * 100).toFixed(0) + "%" : "−").padStart(10) +
    "  " + r.studs.map(m => m.j ? `${m.j.name}(${(m.j.gessha ?? 0).toLocaleString()})` : `${m.raw}[未特定]`).join("、"));
}
const genchi = rows.filter(r => r.genchi > 0);
console.log("\n=== 現地のみ／現地分（生徒紐付けなし・宮崎教室） ===");
for (const r of genchi) console.log(`  ${r.name.padEnd(12)} 現地 ${yen(r.genchi)}`);
console.log(`  現地計 ${yen(genchi.reduce((a, b) => a + b.genchi, 0))}`);
const withG = rows.filter(r => r.gessha > 0);
const tOnline = withG.reduce((a, b) => a + b.online, 0), tG = withG.reduce((a, b) => a + b.gessha, 0);
console.log(`\n担当生徒が特定できた講師 ${withG.length}名: オンライン支払 ${yen(tOnline)} / 担当生徒の月謝計 ${yen(tG)} → 人件費率 ${(tOnline / tG * 100).toFixed(1)}%`);
const un = [...new Set(rows.flatMap(r => r.unmatched))];
console.log(`\n未特定の担当生徒 (${un.length}件): ${un.join("、")}`);
fs.writeFileSync("outputs/koushi-cost.json", JSON.stringify(rows, null, 2));
