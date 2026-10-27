import { Client } from "@notionhq/client";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
async function all(ds) { const r = []; let c; do { const x = await notion.dataSources.query({ data_source_id: ds, start_cursor: c, page_size: 100 }); r.push(...x.results); c = x.has_more ? x.next_cursor : undefined; } while (c); return r; }
const G = (p, k) => { const v = p.properties[k]; if (!v) return null;
  if (v.type === "select") return v.select?.name; if (v.type === "date") return v.date?.start;
  if (v.type === "title") return v.title?.map(t => t.plain_text).join(""); if (v.type === "relation") return v.relation?.map(r => r.id);
  if (v.type === "number") return v.number; if (v.type === "multi_select") return v.multi_select?.map(x => x.name);
  if (v.type === "formula") return v.formula?.string; return null; };
// 塾生DBのプロパティ確認
const jds = await notion.dataSources.retrieve({ data_source_id: "72ee6524-b6fa-4426-a2f2-1e909d0dd7b0" });
const hasRyunyu = Object.keys(jds.properties).some(k => k.includes("流入") || k.includes("キャンペーン") || k.includes("経路"));
console.log(`塾生DBに流入経路のプロパティ: ${hasRyunyu ? "あり" : "★なし"}`);
console.log("リレーション型のプロパティ: " + Object.entries(jds.properties).filter(([, v]) => v.type === "relation").map(([k]) => k).join(" / "));

const camp = new Map();
for (const p of await all("8e8bab1e-37de-4739-a814-b5108901523c")) camp.set(p.id, p.properties["キャンペーン名"]?.title?.map(t => t.plain_text).join("") || "(無題)");
const men = await all("e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb");
const juk = await all("72ee6524-b6fa-4426-a2f2-1e909d0dd7b0");
const norm = (s) => (s ?? "").replace(/[\s　]/g, "");
const mMap = new Map(men.map(p => [norm(G(p, "名前")), p]));
const BIZ = { "33588258-2d8c-8172-a026-f20baacea13a": "宮崎", "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷", "33588258-2d8c-81ce-8737-dbf973eca362": "ローカル" };

const noRec = [], noCamp = [], ok = [];
for (const j of juk) {
  const n = G(j, "名前");
  // 塾生DB名 → 面談DB名 の対応（表記ゆれ・かな表記）
  const ALIAS = { "山下彌耶乃": "山下ややの", "谷野理絵": "谷野理絵（母）", "大高陽夢": "大高はるむ", "川口朔はじめ": "川口朔くん", "一 将冴（はじめ しょうご）": "一将冴" };
  let m = mMap.get(norm(n)) ?? (ALIAS[n] ? mMap.get(norm(ALIAS[n])) : null);
  const alias = (!mMap.get(norm(n)) && m) ? ALIAS[n] : null;
  const biz = (G(j, "事業-年度") ?? []).map(i => BIZ[i]).filter(Boolean)[0] ?? "不明";
  const row = { n, biz, st: G(j, "ステータス"), nyu: G(j, "入塾月"), g: G(j, "月謝"), gk: G(j, "現在の学年") ?? G(j, "学年"), co: (G(j, "コース") ?? []).join(","), mendan: G(j, "最終面談日") };
  if (!m) { noRec.push(row); continue; }
  const cs = (G(m, "流入企画") ?? []).map(i => camp.get(i)).filter(Boolean);
  if (!cs.length) { noCamp.push({ ...row, mendanDate: G(m, "最終面談日"), alias }); continue; }
  ok.push({ ...row, camp: cs.join("＋"), alias });
}
const yen = (n) => n ? "¥" + n.toLocaleString() : "-";
console.log("\n表記ゆれで一致したもの: " + ok.filter(x=>x.alias).map(x=>`${x.n}=${x.alias}`).join(" / "));
console.log(`\n塾生DB ${juk.length}名 → 流入企画あり ${ok.length}名 / 面談DBに流入企画なし ${noCamp.length}名 / 面談DBに記録なし ${noRec.length}名`);
console.log(`\n★★ ① 面談DBに記録がない（流入経路が全く不明）${noRec.length}名 ★★`);
console.log("  名前".padEnd(16) + "事業".padEnd(7) + "学年".padEnd(6) + "ステータス".padEnd(9) + "入塾月".padEnd(12) + "月謝".padStart(10) + "  コース");
for (const r of noRec.sort((a, b) => (a.nyu ?? "9").localeCompare(b.nyu ?? "9")))
  console.log("  " + (r.n ?? "").padEnd(16) + r.biz.padEnd(7) + String(r.gk ?? "-").padEnd(6) + String(r.st ?? "-").padEnd(9) + String(r.nyu ?? "未入力").padEnd(12) + yen(r.g).padStart(10) + "  " + r.co);
console.log(`\n★★ ② 面談DBにはいるが流入企画が未設定 ${noCamp.length}名 ★★`);
console.log("  名前".padEnd(16) + "事業".padEnd(7) + "学年".padEnd(6) + "ステータス".padEnd(9) + "入塾月".padEnd(12) + "面談日".padEnd(12) + "月謝".padStart(10));
for (const r of noCamp.sort((a, b) => (a.nyu ?? "9").localeCompare(b.nyu ?? "9")))
  console.log("  " + (r.n ?? "").padEnd(16) + r.biz.padEnd(7) + String(r.gk ?? "-").padEnd(6) + String(r.st ?? "-").padEnd(9) + String(r.nyu ?? "未入力").padEnd(12) + String(r.mendanDate ?? "-").padEnd(12) + yen(r.g).padStart(10) + (r.alias ? "  ※面談DB表記: " + r.alias : ""));
// 面談DB側で流入企画が未設定の全件（塾生でない人も）
const menNo = men.filter(p => !(G(p, "流入企画") ?? []).length);
console.log(`\n★★ ③ 面談・体験生徒DBで流入企画が未設定 ${menNo.length}/${men.length}件 ★★`);
const byYm = {};
for (const p of menNo) { const d = G(p, "最終面談日"); const k = d ? d.slice(0, 7) : "(面談日なし)"; (byYm[k] ??= []).push(`${G(p, "名前")}(${G(p, "ステータス") ?? "-"})`); }
for (const k of Object.keys(byYm).sort()) console.log(`  ${k}: ${byYm[k].length}名  ${byYm[k].join("、")}`);
