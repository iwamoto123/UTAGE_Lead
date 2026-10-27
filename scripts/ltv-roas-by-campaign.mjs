import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const G = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "select") return v.select?.name; if (v.type === "date") return v.date?.start;
  if (v.type === "title") return v.title?.map(t => t.plain_text).join(""); if (v.type === "relation") return v.relation?.map(r => r.id);
  if (v.type === "formula") return v.formula?.string; if (v.type === "number") return v.number;
  if (v.type === "multi_select") return v.multi_select?.map(x => x.name); return null; };

// ── 継続率の試算（コース別の月次離脱率）──────────────
// 塾生DBの「退会＋休塾中」の人数 ÷ 在籍者数 ÷ 平均経過月数
const CHURN = { "白谷塾オンライン": 0.020, "英検コース": 0.020, "ローカルメディ": 0.062, "再受験コース": 0.083, "編入コース": 0.062, "9月のプログラム": 0.020 };
// 学年ごとの「受験終了までの残り月数」（2026年9月起点、2月で受験終了）
const REMAIN = { "高3": 6, "浪人": 6, "社会人": 12, "大学生": 12, "高2": 18, "高1": 30, "中3": 30, "中2": 42, "未設定": 9 };
// 英検コースは「目標級に合格したらやめる」前提で在籍月数を短く置く。
// 英検は年3回（約4ヶ月間隔）。1級上げるのに平均2回受験＝約8ヶ月。
//   中3・高1 … 最終目標級まで2級分 → 12ヶ月
//   高2      … 1〜2級分           →  8ヶ月
//   高3・社会人・未設定 … 目標級1つ  →  4ヶ月
const REMAIN_EIKEN = { "中3": 12, "高1": 12, "高2": 8, "高3": 4, "浪人": 4, "社会人": 4, "大学生": 4, "未設定": 4 };
const ltv = (gessha, gakunen, course) => {
  const r = CHURN[course] ?? 0.03;
  const n = course === "英検コース" ? (REMAIN_EIKEN[gakunen] ?? 4) : (REMAIN[gakunen] ?? 9);
  return Math.round(gessha * (1 - Math.pow(1 - r, n)) / r);
};

const camp = new Map();
for (const p of await all("8e8bab1e-37de-4739-a814-b5108901523c")) camp.set(p.id, p.properties["キャンペーン名"]?.title?.map(t => t.plain_text).join("") || "(無題)");
const juk = await all("72ee6524-b6fa-4426-a2f2-1e909d0dd7b0");
const men = await all("e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb");
const norm = (s) => (s ?? "").replace(/[\s　]/g, "");
const jMap = new Map(juk.map(p => [norm(G(p, "名前")), p]));

// キャンペーン名の表記ゆれを統合し、広告費を紐づける
const AD = {
  "再受験生 無料面談（ローカルメディ）": 1422514 + 76292,
  "R8 10月英検コース 保護者用": 669976,            // ※週次レポートの「キャンペーン名なし」を英検保護者用と仮定
  "R8 10月英検コース 生徒用": 173634,
  "浪人生・再受験生 個別相談": 374016,
  "熊本大学特化 個別相談": 285849,
  "高1高2 無料Zoom相談（ローカルメディ）": 280482,
  "R8 夏期講習 保護者向け": 133549,
  "R8 夏期講習 生徒向け": 120942,
  "R8 9月の模試 集中対策プログラム 薫さんLP": 43986,
  "R8 9月の模試 集中対策プログラム AI作成のLP": 43637,
  "2026-04-07週 高1・高2お試し": 290542,
  "R8 6月 総体後 無料Zoom相談": 192249,
};
const agg = {};
for (const p of men) {
  const d = G(p, "最終面談日"); if (!d || d < "2026-04" || d > "2026-09") continue;
  const cs = (G(p, "流入企画") ?? []).map(i => camp.get(i) ?? "(不明)");
  const key = (cs[0] ?? "(流入企画 未設定)").replace("再受験生 無料面談(ローカルメディ)", "再受験生 無料面談（ローカルメディ）");
  const f = G(p, "ファネル区分") ?? "";
  (agg[key] ??= { 面談: 0, 体験: 0, 入塾: 0, ltv: 0, 月謝: 0, meisai: [] });
  agg[key].面談++;
  if (f.startsWith("③") || f.startsWith("④")) agg[key].体験++;
  if (!f.startsWith("④")) continue;
  agg[key].入塾++;
  const j = jMap.get(norm(G(p, "名前")));
  const gessha = j ? (G(j, "月謝") ?? 0) : 0;
  const gk = j ? (G(j, "現在の学年") ?? G(j, "学年") ?? "未設定") : "未設定";
  const cl = j ? (G(j, "コース") ?? []) : [];
  const co = cl.includes("英検コース") ? "英検コース" : (cl.find(c => CHURN[c]) ?? ((j && (G(j, "月謝") ?? 0) === 39800) ? "英検コース" : "白谷塾オンライン"));
  const g2 = gessha > 0 ? gessha : (co === "英検コース" ? 39800 : 54942);   // 月謝未入力はコース平均で補完
  const L = ltv(g2, gk, co);
  agg[key].ltv += L; agg[key].月謝 += g2;
  agg[key].meisai.push(`${G(p, "名前")}(${gk}/${co}/¥${g2.toLocaleString()}→LTV¥${L.toLocaleString()})`);
}
const yen = (n) => "¥" + Math.round(n).toLocaleString();
console.log("=== 継続率の前提 ===");
for (const [k, v] of Object.entries(CHURN)) console.log(`  ${k.padEnd(14)} 月次離脱率 ${(v * 100).toFixed(1)}%  → 12ヶ月継続率 ${(Math.pow(1 - v, 12) * 100).toFixed(0)}%`);
console.log("\n=== キャンペーン別 LTV ROAS（2026-04〜08） ===");
console.log("キャンペーン".padEnd(34) + "広告費".padStart(11) + "面談".padStart(5) + "体験".padStart(5) + "入塾".padStart(5) + "CAC".padStart(11) + "LTV合計".padStart(13) + "ROAS".padStart(8));
const rows = [];
for (const [k, v] of Object.entries(agg)) {
  const ad = AD[k] ?? 0;
  rows.push({ k, ad, ...v, cac: v.入塾 ? ad / v.入塾 : null, roas: ad ? v.ltv / ad : null });
}
let tAd = 0, tL = 0, tN = 0;
for (const r of rows.sort((a, b) => b.ad - a.ad)) {
  if (r.ad) { tAd += r.ad; tL += r.ltv; tN += r.入塾; }
  console.log(r.k.slice(0, 33).padEnd(34) + (r.ad ? yen(r.ad) : "−").padStart(11) + String(r.面談).padStart(5) + String(r.体験).padStart(5) + String(r.入塾).padStart(5) +
    (r.cac ? yen(r.cac) : "−").padStart(11) + yen(r.ltv).padStart(13) + (r.roas != null ? r.roas.toFixed(2) : "−").padStart(8));
}
console.log("\n広告あり計".padEnd(34) + yen(tAd).padStart(11) + "".padStart(15) + String(tN).padStart(5) + yen(tAd / tN).padStart(11) + yen(tL).padStart(13) + (tL / tAd).toFixed(2).padStart(8));
console.log("\n=== 入塾者の内訳 ===");
for (const r of rows.filter(r => r.入塾 > 0).sort((a, b) => b.ad - a.ad)) console.log(`【${r.k}】\n   ${r.meisai.join("\n   ")}`);
