// 宮崎銀行(南延岡支店) 5月入出金データを分類して 既存PLと比較
import { Client } from "@notionhq/client";
import iconv from "iconv-lite";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DS_ID = "b8ee1633-7341-4fb8-a926-c308d35f1674";
const BIZ_MAP = {
  "33588258-2d8c-8172-a026-f20baacea13a": "宮崎教室",
  "33588258-2d8c-8160-ac00-d9a18a0238ed": "白谷塾オンライン",
  "33588258-2d8c-81ce-8737-dbf973eca362": "ローカルメディ",
};

const buf = fs.readFileSync("/Users/takeshi/Downloads/nmr20260605234850.csv");
const text = iconv.decode(buf, "cp932");
const lines = text.split(/\r?\n/);

function splitCSV(line) {
  const r = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { r.push(cur); cur = ""; continue; }
    cur += ch;
  }
  r.push(cur);
  return r;
}

const txns = [];
for (let i = 1; i < lines.length; i++) {
  const c = splitCSV(lines[i]);
  if (c.length < 13) continue;
  const dateRaw = c[2];
  const m = dateRaw.match(/(\d{4})年(\d{2})月(\d{2})日/);
  if (!m) continue;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  const out = parseInt((c[4] || "0").replace(/,/g, ""), 10) || 0;
  const inAmt = parseInt((c[5] || "0").replace(/,/g, ""), 10) || 0;
  const txnType = c[8];
  const memo = (c[12] || "").trim();
  txns.push({ date, out, in: inAmt, type: txnType, memo });
}

// 分類ルール
function classify(t) {
  const m = t.memo;
  if (t.in > 0) {
    // 入金
    if (m.includes("M-NET")) return { cat: "売上(M-NET)", biz: "宮崎教室" };
    if (m.includes("グ-グル") || m.includes("ｸﾞ-ｸﾞﾙ")) return { cat: "その他売上(Google)", biz: "宮崎教室" };
    // 個人名入金 = 月謝
    if (m === "シヤラン プルテイク" || m === "ｼﾔﾗﾝ ﾌﾟﾙﾃｲｸ") return { cat: "月謝売上", biz: "白谷塾オンライン" };
    return { cat: "月謝売上(個別)", biz: "?" };
  }
  // 出金
  if (m.includes("フリコミテスウリヨウ") || m.includes("ﾌﾘｺﾐﾃｽｳﾘﾖｳ") || m.includes("ソウフリテスウリヨウ") || m.includes("ｿｳﾌﾘﾃｽｳﾘﾖｳ") || m.includes("ビジネスWEBテスウリ") || m.includes("ﾋﾞｼﾞﾈｽWEBﾃｽｳﾘ")) return { cat: "支払手数料", biz: "宮崎教室" };
  if (m.includes("セゾン") || m.includes("ｾｿﾞﾝ")) return { cat: "広告費(セゾン・既に反映済)", biz: "skip" };
  if (m.includes("ワタナベセキユガス") || m.includes("ﾜﾀﾅﾍﾞｾｷﾕｶﾞｽ")) return { cat: "水道光熱費(ガス)", biz: "宮崎教室" };
  if (m.includes("上下水道") || m.includes("ジヨウゲスイドウ") || m.includes("ｼﾞﾖｳｹﾞｽｲﾄﾞｳ")) return { cat: "水道光熱費(水道)", biz: "宮崎教室" };
  if (m.includes("DF.アルフア") || m.includes("DF.ｱﾙﾌｱ") || m.includes("ヤチン") || m.includes("ﾔﾁﾝ")) return { cat: "地代家賃", biz: "宮崎教室" };
  if (m.includes("CATV") || m.includes("ｺﾞﾚﾝﾗｸ")) return { cat: "通信費(CATV)", biz: "宮崎教室" };
  if (m.includes("ソウキユウフリシキン") || m.includes("ｿｳｷﾕｳﾌﾘｼｷﾝ")) return { cat: "社員給与(総給振資金)", biz: "?" };
  if (m === "カ)シラタニジユク" || m === "ｶ)ｼﾗﾀﾆｼﾞﾕｸ") return { cat: "法人間移動(→株白谷塾)", biz: "宮崎教室" };
  if (m.includes("カ)ブシトドウ") || m.includes("ｶ)ﾌﾞｼﾄﾞｳ")) return { cat: "法人間移動(→株武士道 岩本)", biz: "宮崎教室" };
  if (m.includes("アテナクリエイシヨン") || m.includes("ｱﾃﾅｸﾘｴｲｼﾖﾝ")) return { cat: "業務委託費(アテナ)", biz: "宮崎教室" };
  // 個人名出金 = バイト代
  return { cat: "人件費・個別振込", biz: "?" };
}

// 集計
const totals = new Map(); // cat-biz → amount
const details = new Map();
for (const t of txns) {
  const { cat, biz } = classify(t);
  const key = `${cat}|${biz}`;
  const amt = t.out > 0 ? t.out : t.in;
  totals.set(key, (totals.get(key) ?? 0) + amt);
  if (!details.has(key)) details.set(key, []);
  details.get(key).push(t);
}

console.log("=== 分類別集計 ===\n");
const sortedKeys = [...totals.keys()].sort();
for (const k of sortedKeys) {
  const [cat, biz] = k.split("|");
  const total = totals.get(k);
  const ds = details.get(k);
  console.log(`■ ${cat} [${biz}] ¥${total.toLocaleString()} (${ds.length}件)`);
  for (const d of ds) {
    console.log(`    ${d.date} ${d.type.padEnd(2)} ${d.memo.padEnd(20)} ¥${(d.out > 0 ? d.out : d.in).toLocaleString()}`);
  }
}

// 既存月次PL 2026-05
console.log("\n=== 既存 月次PL 2026-05 (再掲) ===");
const res = await notion.dataSources.query({
  data_source_id: DS_ID,
  filter: { property: "対象月", date: { equals: "2026-05-01" } },
});
const exMap = {};
for (const p of res.results) {
  const bizId = p.properties["事業-年度"]?.relation?.[0]?.id ?? "";
  const biz = BIZ_MAP[bizId] ?? bizId.slice(0,8);
  exMap[biz] = p.properties;
}

const COMPARE = [
  { label: "売上(月謝)", key: "売上", biz: "宮崎教室", csvKey: "月謝売上|宮崎教室" },
  { label: "教材売上", key: "教材売上", biz: "白谷塾オンライン" },
  { label: "社員給与(宮崎)", key: "社員給与", biz: "宮崎教室" },
  { label: "人件費(バイト)宮崎", key: "人件費（バイト代）", biz: "宮崎教室", csvKey: "人件費・個別振込|?" },
  { label: "業務委託費(宮崎)", key: "業務委託費", biz: "宮崎教室", csvKey: "業務委託費(アテナ)|宮崎教室" },
  { label: "地代家賃(宮崎)", key: "地代家賃", biz: "宮崎教室", csvKey: "地代家賃|宮崎教室" },
  { label: "水道光熱費(宮崎)", key: "水道光熱費", biz: "宮崎教室" },
  { label: "通信費(宮崎)", key: "通信費", biz: "宮崎教室", csvKey: "通信費(CATV)|宮崎教室" },
  { label: "支払手数料(宮崎)", key: "支払手数料", biz: "宮崎教室", csvKey: "支払手数料|宮崎教室" },
];

console.log("\n項目                     既存                CSV         差分");
console.log("-".repeat(70));
for (const c of COMPARE) {
  const ex = exMap[c.biz]?.[c.key]?.number ?? 0;
  const csv = c.csvKey ? totals.get(c.csvKey) ?? 0 : null;
  const diff = csv !== null ? csv - ex : null;
  const sign = diff === null ? "-" : (diff === 0 ? "=" : (diff > 0 ? `+¥${diff.toLocaleString()}` : `-¥${(-diff).toLocaleString()}`));
  console.log(`${c.label.padEnd(20)} ¥${ex.toString().padStart(10).replace(/\d{1,3}(?=(\d{3})+$)/g, "$&,")}  ${csv === null ? "-" : "¥" + csv.toString().replace(/\d{1,3}(?=(\d{3})+$)/g, "$&,")}  ${sign}`);
}

// CSV合計 (水道光熱)
const totalSuido = (totals.get("水道光熱費(ガス)|宮崎教室") ?? 0) + (totals.get("水道光熱費(水道)|宮崎教室") ?? 0);
console.log(`\n※水道光熱費CSV合計(ガス+水道)= ¥${totalSuido.toLocaleString()}`);
