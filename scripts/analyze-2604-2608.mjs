import fs from "fs";
const pl = JSON.parse(fs.readFileSync("outputs/pl-2604-2608.json", "utf8"));
const M = ["2026-04","2026-05","2026-06","2026-07","2026-08"];
const B = ["宮崎","白谷","ローカル"];
const v = (m, b, k) => pl[m]?.[b]?.[k] ?? 0;
const yen = (n) => "¥" + Math.round(n).toLocaleString();
const row = (label, f, fmt = yen) => console.log(label.padEnd(24) + M.map(m => String(fmt(f(m))).padStart(13)).join(""));

// 欠損補完の前提
const 社員給与 = { 宮崎: 133334, 白谷: 363333, ローカル: 133333 };   // 4-5月実績が毎月継続
const 地代家賃 = { 宮崎: 53330, 白谷: 0, ローカル: 0 };              // 5月実績(宮崎のみ)
const 水道光熱 = { 宮崎: 38295, 白谷: 0, ローカル: 0 };              // 4-5月平均(宮崎)
const AUG_経費 = { SaaS: 120236, 通信費: 88591, その他経費: 79793 }; // 6月実績を8月の代用（3事業合計・均等割）
const AUG_広告 = { 白谷: 365473, ローカル: 202432, 宮崎: 0 };        // ボード集計（カード明細は8/9までの部分値）

// 広告費: カード明細優先、なければボード集計
const ad = (m, b) => v(m, b, "広告費（カード明細）") || v(m, b, "広告費");
// 経費(SaaS/通信/その他)
const exp = (m, b) => v(m, b, "SaaS利用料") + v(m, b, "通信費") + v(m, b, "その他経費") + v(m, b, "外注費") + v(m, b, "支払手数料") + v(m, b, "リース料") + v(m, b, "減価償却費") + v(m, b, "教材原価");
const salary = (m, b) => v(m, b, "社員給与") || 社員給与[b];
const rent = (m, b) => v(m, b, "地代家賃") || 地代家賃[b];
const util = (m, b) => v(m, b, "水道光熱費") || 水道光熱[b];
const sales = (m, b) => v(m, b, "売上") + v(m, b, "教材売上") + v(m, b, "その他売上");
const baito = (m, b) => v(m, b, "人件費（バイト代）");
const gyomu = (m, b) => v(m, b, "業務委託費");
const cost = (m, b) => baito(m, b) + salary(m, b) + gyomu(m, b) + ad(m, b) + rent(m, b) + util(m, b) + exp(m, b);
const op = (m, b) => sales(m, b) - cost(m, b);
const T = (f) => (m) => B.reduce((a, b) => a + f(m, b), 0);

console.log("=========== 正規化P/L（3事業合計） ===========");
console.log("".padEnd(24) + M.map(m => m.slice(5).padStart(13)).join(""));
row("売上合計", T(sales));
row("　うち宮崎", (m) => sales(m, "宮崎"));
row("　うち白谷オンライン", (m) => sales(m, "白谷"));
row("　うちローカルメディ", (m) => sales(m, "ローカル"));
console.log("");
row("人件費(バイト)", T(baito));
row("人件費(社員給与)", T(salary));
row("業務委託費", T(gyomu));
row("広告費", T(ad));
row("地代家賃+水道光熱", (m) => T(rent)(m) + T(util)(m));
row("SaaS/通信/その他", T(exp));
row("費用合計", T(cost));
console.log("");
row("営業利益", T(op));
row("営業利益率", (m) => T(op)(m) / T(sales)(m), (x) => (x * 100).toFixed(1) + "%");
console.log("");
row("生徒数", T((m, b) => v(m, b, "生徒数")), (n) => n + "名");
row("客単価", (m) => T(sales)(m) / T((mm, b) => v(mm, b, "生徒数"))(m));
row("広告費/売上", (m) => T(ad)(m) / T(sales)(m), (x) => (x * 100).toFixed(1) + "%");
row("人件費/売上", (m) => (T(baito)(m) + T(salary)(m) + T(gyomu)(m)) / T(sales)(m), (x) => (x * 100).toFixed(1) + "%");

for (const b of B) {
  console.log(`\n=========== ${b} ===========`);
  console.log("".padEnd(24) + M.map(m => m.slice(5).padStart(13)).join(""));
  row("売上", (m) => sales(m, b));
  row("生徒数", (m) => v(m, b, "生徒数"), (n) => n + "名");
  row("客単価", (m) => v(m, b, "生徒数") ? sales(m, b) / v(m, b, "生徒数") : 0);
  row("広告費", (m) => ad(m, b));
  row("人件費計", (m) => baito(m, b) + salary(m, b) + gyomu(m, b));
  row("その他費用", (m) => rent(m, b) + util(m, b) + exp(m, b));
  row("営業利益", (m) => op(m, b));
  row("営業利益率", (m) => sales(m, b) ? op(m, b) / sales(m, b) : 0, (x) => (x * 100).toFixed(1) + "%");
  row("生徒純増", (m) => { const i = M.indexOf(m); return i === 0 ? 0 : v(m, b, "生徒数") - v(M[i - 1], b, "生徒数"); }, (n) => (n > 0 ? "+" : "") + n + "名");
  row("広告費/純増1名", (m) => { const i = M.indexOf(m); const d = i === 0 ? 0 : v(m, b, "生徒数") - v(M[i - 1], b, "生徒数"); return d > 0 ? ad(m, b) / d : 0; }, (x) => x ? yen(x) : "−");
}
console.log("\n=========== 累計(4-8月) ===========");
for (const b of B) {
  const s = M.reduce((a, m) => a + sales(m, b), 0), o = M.reduce((a, m) => a + op(m, b), 0), a2 = M.reduce((a, m) => a + ad(m, b), 0);
  console.log(`  ${b.padEnd(6)} 売上 ${yen(s).padStart(12)} / 広告費 ${yen(a2).padStart(12)} / 営業利益 ${yen(o).padStart(12)} (${(o / s * 100).toFixed(1)}%)`);
}
const S = M.reduce((a, m) => a + T(sales)(m), 0), O = M.reduce((a, m) => a + T(op)(m), 0), A = M.reduce((a, m) => a + T(ad)(m), 0);
console.log(`  合計   売上 ${yen(S).padStart(12)} / 広告費 ${yen(A).padStart(12)} / 営業利益 ${yen(O).padStart(12)} (${(O / S * 100).toFixed(1)}%)`);
