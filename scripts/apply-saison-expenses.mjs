// SAISON明細の「広告費以外」を 月次PL の経費科目へ反映する。
// - 科目: SaaS利用料 / 通信費 / その他経費
// - 事業按分: 3事業で均等割り（端数は白谷塾オンラインへ寄せる）
// - 既存値に「加算」する（銀行口座由来の値を消さないため）
// - アップロード履歴のタグで冪等性を担保（同じタグがあればスキップ）
// 使い方: node scripts/apply-saison-expenses.mjs [--dry] --months 2026-05,2026-06,2026-07 file...
import { Client } from "@notionhq/client";
import fs from "fs"; import iconv from "iconv-lite";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_PL = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const R8 = { 白谷塾オンライン: "33588258-2d8c-8160-ac00-d9a18a0238ed", 宮崎教室: "33588258-2d8c-8172-a026-f20baacea13a", ローカルメディ: "33588258-2d8c-81ce-8737-dbf973eca362" };

const AD = ["FACEBK","FACEBOOK","INSTAGRAM","META PLATFORM","META PAYMENTS","GOOGLE ADS","TIKTOK"];
const RULES = [
  [/CURSOR|ANTHROPIC|CLAUDE|UTAGE|ZOOM\.COM|GOOGLE\*WORKSPACE|GOOGLE\*CLOUD|VREW|AQUA VOICE|X CORP|LINE公式アカウント|アマゾンサービシーズインターナショナル/i, "SaaS利用料"],
  [/お名前\.com|NTT西日本|株式会社東名/i, "通信費"],
];
const classify = (s) => (RULES.find(([re]) => re.test(s))?.[1]) ?? "その他経費";

const DRY = process.argv.includes("--dry");
const mi = process.argv.indexOf("--months");
const MONTHS = mi >= 0 ? process.argv[mi + 1].split(",") : [];
const FILES = process.argv.slice(2).filter((a, i) => !a.startsWith("--") && process.argv[i + 1] !== a.replace(/^/, "") && a.endsWith(".csv"));
const TAG = "SAISON経費取込(2607+2608+2609)";

function split(l){const o=[];let c="",q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){c+='"';i++}else q=!q}else if(ch===","&&!q){o.push(c);c=""}else c+=ch}o.push(c);return o}

// 月 × 科目 の合計
const agg = {}; const detail = {};
for (const f of FILES) {
  let h = false;
  for (const line of iconv.decode(fs.readFileSync(f), "cp932").split(/\r?\n/)) {
    const c = split(line);
    if (c[0] === "利用日") { h = true; continue; } if (!h) continue;
    const d = (c[0] ?? "").trim(), shop = (c[1] ?? "").trim(), a = parseInt((c[5] ?? "").trim(), 10);
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(d) || !Number.isFinite(a)) continue;
    if (AD.some((k) => shop.toUpperCase().includes(k))) continue;
    const ym = d.slice(0, 7).replace("/", "-");
    if (!MONTHS.includes(ym)) continue;
    const cat = classify(shop);
    (agg[ym] ??= {})[cat] = (agg[ym][cat] ?? 0) + a;
    ((detail[ym] ??= {})[cat] ??= {})[shop] = ((detail[ym][cat][shop]) ?? 0) + a;
  }
}

const split3 = (t) => { const e = Math.round(t / 3); return { 宮崎教室: e, ローカルメディ: e, 白谷塾オンライン: t - e * 2 }; };

async function findPage(ym, bizId) {
  const r = await notion.dataSources.query({ data_source_id: DS_PL, filter: { and: [{ property: "対象月", date: { equals: `${ym}-01` } }, { property: "事業-年度", relation: { contains: bizId } }] }, page_size: 1 });
  return r.results[0] ?? null;
}

console.log(`=== SAISON明細（広告費以外）→ 月次PL経費 ${DRY ? "【DRY RUN】" : ""} ===`);
console.log(`対象月: ${MONTHS.join(", ")} / 按分: 3事業均等割り\n`);

for (const ym of MONTHS) {
  const cats = agg[ym] ?? {};
  const monthTotal = Object.values(cats).reduce((a, b) => a + b, 0);
  console.log(`【${ym}】 広告費以外 合計 ¥${monthTotal.toLocaleString()}`);
  for (const [cat, t] of Object.entries(cats)) {
    console.log(`  ▼ ${cat}: ¥${t.toLocaleString()}`);
    for (const [s, v] of Object.entries(detail[ym][cat]).sort((a, b) => b[1] - a[1])) console.log(`       ${s.padEnd(34)} ¥${v.toLocaleString().padStart(9)}`);
  }
  for (const bizName of ["白谷塾オンライン", "宮崎教室", "ローカルメディ"]) {
    const page = await findPage(ym, R8[bizName]);
    if (!page) { console.log(`  ! ${bizName}: レコードなし（スキップ）`); continue; }
    const hist = page.properties["アップロード履歴"]?.rich_text?.map((t) => t.plain_text).join("") ?? "";
    if (hist.includes(TAG)) { console.log(`  ⏭ ${bizName}: ${TAG} は反映済み`); continue; }
    const props = {}; const logs = [];
    for (const [cat, t] of Object.entries(cats)) {
      const add = split3(t)[bizName];
      const prev = page.properties[cat]?.number ?? 0;
      props[cat] = { number: prev + add };
      logs.push(`${cat} ¥${prev.toLocaleString()}+¥${add.toLocaleString()}=¥${(prev + add).toLocaleString()}`);
    }
    console.log(`  ${DRY ? "would update" : "update"} ${bizName.padEnd(9)} ${logs.join(" / ")}`);
    if (!DRY) {
      const ts = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
      props["アップロード履歴"] = { rich_text: [{ text: { content: [hist, `${ts} ${TAG} ${bizName}: ${logs.join(" / ")}`].filter(Boolean).join("\n") } }] };
      await notion.pages.update({ page_id: page.id, properties: props });
    }
  }
  console.log("");
}
console.log(DRY ? "DRY RUN 完了（Notionは未変更）" : "完了");
