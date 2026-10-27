import fs from "fs";
const { mendan, jukusei } = JSON.parse(fs.readFileSync("outputs/funnel-raw.json", "utf8"));
const norm = (s) => (s ?? "").replace(/[\s　]/g, "");
const M = ["2026-04","2026-05","2026-06","2026-07","2026-08"];

console.log("=== 塾生DB 事業別 ===");
const jb = {}; for (const j of jukusei) jb[j.biz] = (jb[j.biz] ?? 0) + 1;
console.log("  " + Object.entries(jb).map(([k, v]) => `${k}:${v}`).join(" / "));
console.log("=== 面談DB 事業別 ===");
const mb = {}; for (const m of mendan) mb[m.biz] = (mb[m.biz] ?? 0) + 1;
console.log("  " + Object.entries(mb).map(([k, v]) => `${k}:${v}`).join(" / "));

// 名寄せ: 塾生DBを正とし、面談DBの同名レコードを統合
const jByName = new Map(jukusei.map(j => [norm(j.name), j]));
const people = [];
for (const j of jukusei) people.push({ name: j.name, biz: j.biz, mendanDate: j.mendanDate, nyujuku: j.nyujuku, stage: "④入塾", src: "塾生DB", gessha: j.gessha, st: j.st });
for (const m of mendan) {
  const j = jByName.get(norm(m.name));
  if (j) { // 統合済み。面談日が塾生DB側に無ければ補完
    const p = people.find(x => norm(x.name) === norm(m.name) && x.src === "塾生DB");
    if (p && !p.mendanDate) p.mendanDate = m.mendanDate;
    if (p && p.biz === "不明") p.biz = m.biz;
    continue;
  }
  people.push({ name: m.name, biz: m.biz, mendanDate: m.mendanDate, nyujuku: null, stage: m.funnel, src: "面談DB", st: m.st });
}
console.log(`\n名寄せ後の実人数: ${people.length}名（面談DB ${mendan.length} + 塾生DB ${jukusei.length} − 重複 ${mendan.length + jukusei.length - people.length}）`);

// ① 面談月ベースのファネル
console.log("\n=== ① 面談月ごとの到達段階（名寄せ後） ===");
console.log("面談月".padEnd(10) + ["面談件数","入塾","体験まで到達","面談後お断り","検討中のまま"].map(s => s.padStart(14)).join(""));
const stageOf = (p) => p.stage ?? "";
let tot = { n: 0, in: 0, taiken: 0, kotowari: 0, kentou: 0 };
for (const ym of M) {
  const g = people.filter(p => p.mendanDate?.slice(0, 7) === ym);
  const inn = g.filter(p => stageOf(p).startsWith("④")).length;
  const taiken = g.filter(p => stageOf(p).startsWith("③") || stageOf(p).startsWith("④")).length;
  const kot = g.filter(p => stageOf(p).startsWith("②")).length;
  const ken = g.filter(p => stageOf(p).startsWith("①")).length;
  tot.n += g.length; tot.in += inn; tot.taiken += taiken; tot.kotowari += kot; tot.kentou += ken;
  const pct = (a, b) => b ? ` (${Math.round(a / b * 100)}%)` : "";
  console.log(ym.padEnd(10) + [String(g.length), inn + pct(inn, g.length), taiken + pct(taiken, g.length), String(kot), String(ken)].map(s => s.padStart(14)).join(""));
}
console.log("計".padEnd(10) + [String(tot.n), `${tot.in} (${Math.round(tot.in / tot.n * 100)}%)`, `${tot.taiken} (${Math.round(tot.taiken / tot.n * 100)}%)`, String(tot.kotowari), String(tot.kentou)].map(s => s.padStart(14)).join(""));

// ② 事業別
console.log("\n=== ② 面談月 × 事業（面談件数 → 入塾） ===");
for (const b of ["白谷", "ローカル"]) {
  const line = M.map(ym => {
    const g = people.filter(p => p.mendanDate?.slice(0, 7) === ym && p.biz === b);
    const inn = g.filter(p => stageOf(p).startsWith("④")).length;
    return `${g.length}→${inn}`;
  });
  console.log("  " + b.padEnd(7) + M.map((m, i) => (m.slice(5) + " " + line[i]).padStart(14)).join(""));
}

// ③ 入塾月ベース（塾生DBの事実）
console.log("\n=== ③ 入塾月ごとの新規入塾者数（塾生DBの入塾月） ===");
console.log("入塾月".padEnd(10) + ["新規入塾","白谷","ローカル","不明"].map(s => s.padStart(12)).join(""));
for (const ym of M) {
  const g = jukusei.filter(j => j.nyujuku?.slice(0, 7) === ym);
  console.log(ym.padEnd(10) + [g.length, g.filter(x => x.biz === "白谷").length, g.filter(x => x.biz === "ローカル").length, g.filter(x => x.biz === "不明").length].map(n => String(n).padStart(12)).join(""));
}
const g9 = jukusei.filter(j => j.nyujuku?.slice(0, 7) === "2026-09");
console.log("2026-09".padEnd(10) + [g9.length, g9.filter(x => x.biz === "白谷").length, g9.filter(x => x.biz === "ローカル").length, g9.filter(x => x.biz === "不明").length].map(n => String(n).padStart(12)).join(""));
console.log(`  ※ 入塾月が未入力: ${jukusei.filter(j => !j.nyujuku).length}名`);

// ④ 現在の在籍
console.log("\n=== ④ 塾生DB 現在のステータス × 事業 ===");
const st = {};
for (const j of jukusei) { st[j.st] ??= {}; st[j.st][j.biz] = (st[j.st][j.biz] ?? 0) + 1; }
for (const [k, v] of Object.entries(st)) console.log(`  ${k.padEnd(8)} ` + Object.entries(v).map(([b, n]) => `${b}:${n}`).join(" / "));

// ⑤ 月謝
const gs = jukusei.filter(j => j.gessha).map(j => j.gessha);
console.log(`\n=== ⑤ 月謝(塾生DB) 入力あり ${gs.length}/${jukusei.length}名 / 平均 ¥${gs.length ? Math.round(gs.reduce((a, b) => a + b, 0) / gs.length).toLocaleString() : 0} ===`);

// ⑥ 面談日が未入力の人
console.log(`\n=== ⑥ データの穴 ===`);
console.log(`  名寄せ後で最終面談日が未入力: ${people.filter(p => !p.mendanDate).length}名`);
console.log(`  塾生DBで入塾月が未入力: ${jukusei.filter(j => !j.nyujuku).length}名 → ${jukusei.filter(j => !j.nyujuku).map(j => j.name).join("、")}`);
console.log(`  体験開始日: 面談DB・塾生DB とも全件未入力`);
