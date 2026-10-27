// 宮崎教室スタッフ3名にチャンネルを委任した場合の運営コストと獲得見込み
const 時給 = 1300, 時間 = 6, 単価 = 時給 * 時間;   // 1本 ¥7,800
const LINE_PER = 2.66;                            // 1本あたりLINE追加（YouTube KPI DB 29本の実績）
const 入会率 = [0.005, 0.0075, 0.01];             // LINE追加からの入会率
const 教材率 = 0.02, 教材単価 = 40000, 教材原価 = 1500;
const LTV_高3 = 398410, LTV_英検高1 = 428414, LTV_平均 = Math.round((398410 + 428414) / 2);
const 損益分岐ROAS = 4.12;
const yen = (n) => "¥" + Math.round(n).toLocaleString();

console.log("=== 前提 ===");
console.log(`  1本 ${時間}時間 × 時給¥${時給} = ${yen(単価)}／本`);
console.log(`  1本あたりLINE追加 ${LINE_PER}件（YouTube KPI DB 入力済み29本・合計77件の実績）`);
console.log(`  LINE追加からの入会率 0.5〜1.0%／教材購入率 ${教材率 * 100}%（単価${yen(教材単価)}・原価${yen(教材原価)}）`);
console.log(`  入会1名のLTV ${yen(LTV_平均)}（白谷高3 ${yen(LTV_高3)} と英検高1 ${yen(LTV_英検高1)} の平均）\n`);

console.log("=== 本数別の月次コストと獲得 ===");
console.log("本数/月".padEnd(9) + "編集費".padStart(11) + "LINE追加".padStart(10) + "入会0.5%".padStart(10) + "入会1.0%".padStart(10) + "教材2%".padStart(9) + "月次リターン(0.75%)".padStart(20) + "ROAS".padStart(8));
for (const n of [12, 13, 18, 20, 24, 26]) {
  const cost = n * 単価, line = n * LINE_PER;
  const ret = line * 0.0075 * LTV_平均 + line * 教材率 * (教材単価 - 教材原価);
  console.log(`${n}本`.padEnd(9) + yen(cost).padStart(11) + line.toFixed(1).padStart(10) +
    (line * 0.005).toFixed(2).padStart(10) + (line * 0.01).toFixed(2).padStart(10) +
    (line * 教材率).toFixed(2).padStart(9) + yen(ret).padStart(20) + (ret / cost).toFixed(2).padStart(8));
}
console.log("\n=== リード1件あたりの経済性 ===");
const costPerLead = 単価 / LINE_PER;
console.log(`  LINE追加1件あたりの編集費 ${yen(costPerLead)}`);
for (const r of 入会率) {
  const v = r * LTV_平均 + 教材率 * (教材単価 - 教材原価);
  console.log(`  入会率${(r * 100).toFixed(2)}%: 1件あたり価値 ${yen(v)}（入会${yen(r * LTV_平均)}＋教材${yen(教材率 * (教材単価 - 教材原価))}） → ROAS ${(v / costPerLead).toFixed(2)}`);
}
console.log("\n=== 動画はストック資産：公開後も再生が伸びる場合 ===");
console.log("累積LINE追加".padEnd(16) + "1本あたり".padStart(10) + "ROAS(0.5%)".padStart(12) + "ROAS(0.75%)".padStart(13) + "ROAS(1.0%)".padStart(12));
for (const [lbl, mult] of [["計測時点（実績）", 1], ["6ヶ月後（2倍）", 2], ["12ヶ月後（3倍）", 3], ["24ヶ月後（4倍）", 4]]) {
  const lp = LINE_PER * mult, cpl = 単価 / lp;
  const line = [0.005, 0.0075, 0.01].map(r => ((r * LTV_平均 + 教材率 * (教材単価 - 教材原価)) / cpl).toFixed(2));
  console.log(lbl.padEnd(16) + lp.toFixed(2).padStart(10) + line[0].padStart(12) + line[1].padStart(13) + line[2].padStart(12));
}
console.log(`\n  ※ 損益分岐ROAS ${損益分岐ROAS} を超えるのに必要な1本あたりLINE追加数:`);
for (const r of 入会率) {
  const v = r * LTV_平均 + 教材率 * (教材単価 - 教材原価);
  console.log(`     入会率${(r * 100).toFixed(2)}%: ${(単価 * 損益分岐ROAS / v).toFixed(1)}件／本（現在 ${LINE_PER}件）`);
}
console.log("\n=== 年間（9〜3月の7ヶ月）===");
for (const n of [13, 20, 26]) {
  const cost = n * 単価 * 7, line = n * LINE_PER * 7;
  const nyu = line * 0.0075, kyo = line * 教材率;
  const ret = nyu * LTV_平均 + kyo * (教材単価 - 教材原価);
  console.log(`  月${n}本: 編集費 ${yen(cost)} / 動画${n * 7}本 / LINE追加${line.toFixed(0)}件 → 入会${nyu.toFixed(1)}名・教材${kyo.toFixed(1)}冊 → リターン ${yen(ret)}（ROAS ${(ret / cost).toFixed(2)}）`);
}
