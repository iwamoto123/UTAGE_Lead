// 塾生DBの「流入キャンペーン」ベースで LTV ROAS を再計算（全56名の経路が判明した版）
import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const T = (p, k) => p.properties[k]?.title?.map(t => t.plain_text).join("") ?? "";
const S = (p, k) => p.properties[k]?.select?.name ?? null;
const N = (p, k) => p.properties[k]?.number ?? null;
const D = (p, k) => p.properties[k]?.date?.start ?? null;
const MS = (p, k) => p.properties[k]?.multi_select?.map(x => x.name) ?? [];
const REL = (p, k) => (p.properties[k]?.relation ?? []).map(r => r.id);

const CHURN = { "白谷塾オンライン": 0.020, "英検コース": 0.020, "ローカルメディ": 0.062, "再受験コース": 0.083, "編入コース": 0.062, "9月のプログラム": 0.020 };
const REMAIN = { "高3": 6, "浪人": 6, "社会人": 12, "大学生": 12, "高2": 18, "高1": 30, "中3": 30, "未設定": 9 };
const REMAIN_EIKEN = { "中3": 12, "高1": 12, "高2": 8, "高3": 4, "浪人": 4, "社会人": 4, "大学生": 4, "未設定": 4 };
const ltv = (g, gk, co) => { const r = CHURN[co] ?? 0.03; const n = co === "英検コース" ? (REMAIN_EIKEN[gk] ?? 4) : (REMAIN[gk] ?? 9); return Math.round(g * (1 - Math.pow(1 - r, n)) / r); };

// 週次広告レポートのキャンペーン別実績（4〜8月）
const AD = {
  "再受験生 無料面談（ローカルメディ）": 1498806,
  "R8 10月英検コース 保護者用": 669976,
  "浪人生・再受験生 個別相談": 374016,
  "高1 高2 お試しキャンペーン（ローカルメディ）": 290542,
  "熊本大学特化 個別相談": 285849,
  "高1高2 無料Zoom相談（ローカルメディ）": 280482,
  "R8 6月 総体後 無料Zoom相談": 192249,
  "R8 10月英検コース 生徒用": 173634,
  "R8 夏期講習 保護者向け": 133549,
  "R8 夏期講習 生徒向け": 120942,
  "R8 9月の模試 集中対策プログラム 薫さんLP": 43986,
  "R8 9月の模試 集中対策プログラム AI作成のLP": 43637,
};
const camps = await all("8e8bab1e-37de-4739-a814-b5108901523c");
const cName = new Map(camps.map(p => [p.id, T(p, "キャンペーン名") || "(無題)"]));
const juku = await all("72ee6524-b6fa-4426-a2f2-1e909d0dd7b0");

const agg = {};
for (const p of juku) {
  const nyu = D(p, "入塾月"); const st = S(p, "ステータス");
  // 短期プログラム実施中は体験中と同じ扱い（2026-09にステータスを分離した）
  const isTaiken = st === "体験中" || st === "9月のプログラム実施中" || st === "残り100日プログラム実施中" || st === "11月模試対策プログラム実施中";
  if (!nyu && !isTaiken) continue;             // 入塾月なし＆体験中でない＝対象外
  if (nyu && nyu < "2026-04") continue;        // 前年度の入塾は対象外
  const k = cName.get(REL(p, "流入キャンペーン")[0]) ?? "(未設定)";
  const cl = MS(p, "コース");
  const co = cl.includes("英検コース") ? "英検コース" : (cl.find(c => CHURN[c]) ?? ((N(p, "月謝") ?? 0) === 39800 ? "英検コース" : "白谷塾オンライン"));
  const gk = S(p, "現在の学年") ?? S(p, "学年") ?? "未設定";
  const g = (N(p, "月謝") ?? 0) > 0 ? N(p, "月謝") : (co === "英検コース" ? 39800 : (gk === "高3" || gk === "浪人" ? 59800 : 54942));
  const L = ltv(g, gk, co);
  agg[k] ??= { n: 0, taiken: 0, ltv: 0, ltvT: 0, names: [] };
  if (isTaiken && !nyu) { agg[k].taiken++; agg[k].ltvT += L; } else { agg[k].n++; agg[k].ltv += L; }
  agg[k].names.push(`${T(p, "名前")}(${gk}/${co}/¥${g.toLocaleString()}→${L.toLocaleString()})`);
}
const yen = (n) => "¥" + Math.round(n).toLocaleString();
console.log("=== キャンペーン別 LTV ROAS（塾生DBの流入キャンペーンベース・2026-04以降の入塾＋体験中）===");
console.log("キャンペーン".padEnd(34) + "広告費".padStart(11) + "入塾".padStart(6) + "体験中".padStart(7) + "入塾CAC".padStart(11) + "確定LTV".padStart(13) + "ROAS".padStart(8) + "体験込ROAS".padStart(12));
let tAd = 0, tN = 0, tL = 0, tT = 0;
const rows = Object.entries(agg).map(([k, v]) => ({ k, ad: AD[k] ?? 0, ...v })).sort((a, b) => b.ad - a.ad || b.ltv - a.ltv);
for (const r of rows) {
  const paid = r.ad > 0;
  if (paid) { tAd += r.ad; tN += r.n; tL += r.ltv; tT += r.ltvT; }
  console.log(r.k.slice(0, 33).padEnd(34) + (r.ad ? yen(r.ad) : "−").padStart(11) + String(r.n).padStart(6) + String(r.taiken).padStart(7) +
    (r.ad && r.n ? yen(r.ad / r.n) : "−").padStart(11) + yen(r.ltv).padStart(13) + (r.ad ? (r.ltv / r.ad).toFixed(2) : "−").padStart(8) + (r.ad ? ((r.ltv + r.ltvT) / r.ad).toFixed(2) : "−").padStart(12));
}
// 入塾ゼロの広告
for (const [k, a] of Object.entries(AD)) if (!agg[k]) { tAd += a; console.log(k.slice(0, 33).padEnd(34) + yen(a).padStart(11) + "0".padStart(6) + "0".padStart(7) + "−".padStart(11) + "¥0".padStart(13) + "0.00".padStart(8)); }
console.log("\n" + "広告あり 計".padEnd(34) + yen(tAd).padStart(11) + String(tN).padStart(6) + "".padStart(7) + yen(tAd / tN).padStart(11) + yen(tL).padStart(13) + (tL / tAd).toFixed(2).padStart(8) + ((tL + tT) / tAd).toFixed(2).padStart(12));
const F = 1623008, v = 0.238;
console.log("\n=== 損益分岐ROASとの比較 ===");
for (const [lbl, s] of [["4〜8月平均（月商338万）", 3383711], ["8月実績（月商448万）", 4483400], ["10月予測（月商630万）", 6300000], ["11月予測（月商910万）", 9100000]]) {
  const a = (1 - v) - F / s;
  console.log(`  ${lbl.padEnd(24)} 損益分岐ROAS ${(1 / a).toFixed(2)}倍 → 確定分 ${(tL / tAd).toFixed(2)}倍 → ${(tL / tAd) >= 1 / a ? "★超えている" : "下回る"}／体験込 ${((tL+tT) / tAd).toFixed(2)}倍`);
}
console.log("\n=== 入塾者の内訳 ===");
for (const r of rows) console.log(`【${r.k}】(${r.n}名)\n   ${r.names.join("\n   ")}`);
