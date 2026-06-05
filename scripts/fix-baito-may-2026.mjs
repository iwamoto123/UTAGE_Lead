// 5月R8 バイト代の名前正規化と宮本諒人の振り分け修正
import fs from "fs";
const PATH = "src/data/baito.json";
const data = JSON.parse(fs.readFileSync(PATH, "utf8"));

const RENAMES = {
  "水元心春": "水元小春",
  "湯浅祥平": "湯淺祥平",
  "中山 みさ": "中山みさ",
};

let renamed = 0, reassigned = 0;
for (const r of data.records) {
  if (r.ym !== "2026-05") continue;

  // 名前正規化
  if (RENAMES[r.name]) {
    console.log(`name: ${r.name} → ${RENAMES[r.name]}`);
    r.name = RENAMES[r.name];
    renamed++;
  }

  // 宮本諒人: 宮崎教室→白谷塾オンライン、genchi→online
  if (r.name === "宮本諒人") {
    console.log(`reassign 宮本諒人: ${r.business} → 白谷塾オンライン, genchi¥${r.genchi}→online`);
    r.business = "白谷塾オンライン";
    r.online = r.total;
    r.genchi = 0;
    reassigned++;
  }
}

// businessMonth 再集計
const bm = new Map();
for (const r of data.records) {
  if (r.ym !== "2026-05") continue;
  bm.set(r.business, (bm.get(r.business) || 0) + r.total);
}
data.businessMonth = data.businessMonth.filter(b => b.ym !== "2026-05");
for (const [biz, total] of bm) data.businessMonth.push({ business: biz, ym: "2026-05", total });

console.log(`\n名前正規化 ${renamed}件 / 振り分け修正 ${reassigned}件`);
console.log("\n=== 2026-05 事業別 ===");
for (const [b, s] of bm) console.log(`  ${b}: ¥${s.toLocaleString()}`);

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log("\n✓ baito.json 更新");
