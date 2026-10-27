// 短期プログラムのユニットエコノミクス（1万円・1ヶ月ちょっと・入会金3万円で相殺）
const 参加 = 10, 参加費 = 10000, 広告費 = 87623, 入会金 = 30000;
const 月謝 = 59800, 講師率 = 0.372;   // オンライン系のバイト代÷売上（8月実績）
const 残月 = 5;                        // 10月入塾→2月まで
const 離脱 = 0.02;
const yen = (n) => (n < 0 ? "−¥" : "¥") + Math.abs(Math.round(n)).toLocaleString();
const CASES = [
  { n: "A 指導のみ 5時間", h: 5, tanto: 0 },
  { n: "B 指導のみ 10時間", h: 10, tanto: 0 },
  { n: "C 担当費＋指導5時間", h: 5, tanto: 10000 },
  { n: "D 担当費＋指導10時間", h: 10, tanto: 10000 },
];
console.log(`【前提】参加${参加}名 × ¥${参加費.toLocaleString()} = ¥${(参加*参加費).toLocaleString()} ／ 広告費 ¥${広告費.toLocaleString()} ／ 入会金 ¥${入会金.toLocaleString()} ／ 時給¥1,300\n`);
console.log("=== プログラム期間中の収支（10名分）===");
console.log("ケース".padEnd(22)+"指導人件費".padStart(12)+"1名あたり".padStart(11)+"期間中の損益".padStart(14)+"入会金で相殺に必要な入塾数".padStart(26));
const rows=[];
for (const c of CASES) {
  const per = c.h * 1300 + c.tanto, tot = per * 参加;
  const pl = 参加 * 参加費 - 広告費 - tot;
  const need = Math.ceil(-pl / 入会金);
  rows.push({ ...c, per, tot, pl, need });
  console.log(c.n.padEnd(22)+yen(tot).padStart(12)+yen(per).padStart(11)+yen(pl).padStart(14)+(need+"名").padStart(26));
}
console.log("\n=== 入塾数別の累計損益（入会金まで）===");
console.log("ケース".padEnd(22)+["3名(30%)","5名(50%)","7名(70%)"].map(s=>s.padStart(13)).join(""));
for (const r of rows) console.log(r.n.padEnd(22)+[3,5,7].map(k=>yen(r.pl + k*入会金).padStart(13)).join(""));
// 入塾後の粗利
const 粗利月 = 月謝 * (1 - 講師率);
let surv = 0; for (let t = 0; t < 残月; t++) surv += Math.pow(1 - 離脱, t);
const 粗利計 = 粗利月 * surv;
console.log(`\n=== 入塾後（10月入塾→2月まで${残月}ヶ月）===`);
console.log(`  月謝 ${yen(月謝)} − 講師人件費${(講師率*100).toFixed(1)}% ${yen(月謝*講師率)} = 月の粗利 ${yen(粗利月)}`);
console.log(`  ${残月}ヶ月の粗利（離脱率${(離脱*100)}%考慮） ${yen(粗利計)}／名`);
console.log("\n=== プログラム全体の最終損益 ===");
console.log("ケース".padEnd(22)+["3名入塾","5名入塾","7名入塾"].map(s=>s.padStart(14)).join(""));
for (const r of rows) console.log(r.n.padEnd(22)+[3,5,7].map(k=>yen(r.pl + k*入会金 + k*粗利計).padStart(14)).join(""));
console.log("\n=== 1名あたりのLTV（入会金込み・10月入塾）===");
console.log(`  月謝${残月}ヶ月の売上 ${yen(月謝*surv)} ＋ 入会金 ${yen(入会金)} ＋ プログラム参加費 ${yen(参加費)} = ${yen(月謝*surv+入会金+参加費)}`);
console.log(`  広告費（参加者1名あたり）${yen(広告費/参加)} に対する倍率 ${((月謝*surv+入会金+参加費)/(広告費/参加)).toFixed(1)}倍`);
