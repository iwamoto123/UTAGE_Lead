// バイトCSVを12ファイル分パースして 講師×月×内訳で集計
import fs from "fs";
import path from "path";

const DOWNLOAD_DIR = "/Users/takeshi/Downloads";

// ファイル名 → 対象月 (YYYY-MM)
// 5月-12月 = 2025年, 1月-4月 = 2026年
const FILES = [
  { ym: "2025-05", file: "バイト生 武士道 振込 - 5月.csv" },
  { ym: "2025-06", file: "バイト生 武士道 振込 - 6月.csv" },
  { ym: "2025-07", file: "バイト生 武士道 振込 - 7月.csv" },
  { ym: "2025-08", file: "バイト生 武士道 振込 - 8月.csv" },
  { ym: "2025-09", file: "バイト生 武士道 振込 - 9月.csv" },
  { ym: "2025-10", file: "バイト生 武士道 振込 - 10月.csv" },
  { ym: "2025-11", file: "バイト生 武士道 振込 - 11月.csv" },
  { ym: "2025-12", file: "バイト生 武士道 振込 - 12月.csv" },
  { ym: "2026-01", file: "バイト生 武士道 振込 - 1月.csv" },
  { ym: "2026-02", file: "バイト生 武士道 振込 - 2月.csv" },
  { ym: "2026-03", file: "バイト生 武士道 振込 - 3月.csv" },
  { ym: "2026-04", file: "バイト生 武士道 振込 - 4月.csv" },
];

// 講師名(スペース/ふりがな揺れ吸収) → 事業
const INSTRUCTOR_BUSINESS = {
  // 白谷塾オンライン
  "酒井駿介": "白谷塾オンライン",
  "湯淺祥平": "白谷塾オンライン",
  "山中詩織": "白谷塾オンライン",
  "弓削カノン": "白谷塾オンライン",
  "首藤顕心": "白谷塾オンライン",
  "松下飛海": "白谷塾オンライン",
  "酒井未羽": "白谷塾オンライン",
  "門脇孔明": "白谷塾オンライン",
  "大許真菜": "白谷塾オンライン",
  "伊地知隼": "白谷塾オンライン",
  "竹内壮吾": "白谷塾オンライン",
  "佐野心音": "白谷塾オンライン",
  "山内碧泉": "白谷塾オンライン",
  "梶加衣人": "白谷塾オンライン",
  "藤岡来実": "白谷塾オンライン",
  "家根原宗佑": "白谷塾オンライン",
  "内田悠太": "白谷塾オンライン",
  "香村彩奈": "白谷塾オンライン",
  "水元小春": "白谷塾オンライン",
  "有川悠斗": "白谷塾オンライン",
  "兼田万智子": "白谷塾オンライン",
  // ローカルメディ
  "藤山航": "ローカルメディ",
  "桑室泰享": "ローカルメディ",
  "堤香代子": "ローカルメディ",
  // 現地（宮崎教室）
  "田代汀": "宮崎教室",
  "田代　汀": "宮崎教室",
  "中山みさ": "宮崎教室",
  "中山　みさ": "宮崎教室",
  "徳永日向子": "宮崎教室",
};

const NAME_ALIASES = {
  "門脇孔明カドワキコウメイ": "門脇孔明",
  "水元心春": "水元小春",
  "湯浅祥平": "湯淺祥平",
};

function normalizeName(name) {
  let n = name.replace(/\s|　/g, "").trim();
  if (NAME_ALIASES[n]) n = NAME_ALIASES[n];
  return n;
}

function parseAmount(s) {
  if (!s) return 0;
  let str = String(s);
  // "104,850円(83時間)" → 104850
  str = str.replace(/\([^)]*\)/g, "");
  // "2万400円" → 20400
  const manMatch = str.match(/^(\d+)万([\d,]*)円?/);
  if (manMatch) {
    return parseInt(manMatch[1]) * 10000 + (manMatch[2] ? parseInt(manMatch[2].replace(/,/g, "")) : 0);
  }
  str = str.replace(/[円,\s\n]/g, "");
  const n = parseInt(str);
  return isNaN(n) ? 0 : n;
}

function parseCsv(text) {
  // 簡易CSVパーサー (引用符内の改行/カンマ対応)
  const rows = [];
  let row = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function parseBreakdown(s) {
  // 内訳テキストから 担当生徒数, 担当費, オンライン/現地時間と金額を抽出
  const out = {
    students: 0,
    tantoFee: 0,
    onlineHours: 0,
    onlineAmount: 0,
    genchiHours: 0,
    genchiAmount: 0,
  };
  if (!s) return out;
  // 数値中のカンマ除去（,1,000→1000）
  const text = s.replace(/(\d),(\d)/g, "$1$2");
  // 担当生徒数 / 担当人数 (数字単独、後続は人 or 数字以外)
  const sm = text.match(/担当(?:生徒数|人数)[\s:：　]*(\d+)/);
  if (sm) out.students = parseInt(sm[1]);
  // 担当費 / 担当費用
  const tm = text.match(/担当費(?:用)?[\s:：　]*(\d+)\s*円?/);
  if (tm) out.tantoFee = parseInt(tm[1]);
  // 現地バイト X時間 Y円 (時間と金額の両方)
  const genchiBoth = text.match(/現地[^\n]{0,15}?([\d.]+)\s*時間[^\n]{0,10}?(\d+)\s*円/);
  if (genchiBoth) {
    out.genchiHours = parseFloat(genchiBoth[1]);
    out.genchiAmount = parseInt(genchiBoth[2]);
  } else {
    const genchiH = text.match(/現地[^\n]{0,15}?([\d.]+)\s*時間/);
    if (genchiH) {
      const h = parseFloat(genchiH[1]);
      if (h > 0 && h < 100) {
        out.genchiHours = h;
        out.genchiAmount = Math.round(h * 1300);
      }
    }
  }
  // オンラインバイト X時間 Y円
  const onlineBoth = text.match(/オンライン[^\n]{0,15}?([\d.]+)\s*時間[^\n]{0,10}?(\d+)\s*円/);
  if (onlineBoth) {
    out.onlineHours = parseFloat(onlineBoth[1]);
    out.onlineAmount = parseInt(onlineBoth[2]);
  } else {
    const onlineH = text.match(/オンライン[^\n]{0,15}?([\d.]+)\s*時間/);
    if (onlineH) {
      const h = parseFloat(onlineH[1]);
      if (h > 0 && h < 200) {
        out.onlineHours = h;
        out.onlineAmount = Math.round(h * 1300);
      }
    }
  }
  return out;
}

function detectContent(barContent, breakdownText, sectionHint) {
  // バイト内容を判定: online / genchi / both
  if (barContent) {
    if (barContent.includes("兼")) return "both";
    if (barContent.includes("現地")) return "genchi";
    if (barContent.includes("オンライン") || barContent.includes("チューター")) return "online";
  }
  if (sectionHint) return sectionHint;
  // 内訳から推定
  const br = parseBreakdown(breakdownText);
  const hasOnline = br.onlineHours > 0 || br.tantoFee > 0;
  const hasGenchi = br.genchiHours > 0;
  if (hasOnline && hasGenchi) return "both";
  if (hasGenchi) return "genchi";
  return "online";
}

// 講師×YM×事業分配（オンライン分は事業ごとに分けて記録）
// 内訳 (担当費 + オンラインバイト金額) → 講師所属事業に計上
// 現地バイト金額 → 宮崎教室
const byInstrMonth = {}; // key: name|ym -> {business, total, online, genchi, students, raw}
const byBusinessMonth = {}; // key: business|ym -> {total, count}
const skipped = [];
const unmapped = new Set();

function addRecord(rawName, ym, totalAmount, breakdownText, content, done) {
  const name = normalizeName(rawName);
  if (!name) return;
  const br = parseBreakdown(breakdownText);
  let business = INSTRUCTOR_BUSINESS[name];
  if (!business) {
    if (content === "genchi") business = "宮崎教室";
    else { unmapped.add(name); business = "白谷塾オンライン"; }
  }
  // 現地分 / オンライン分 を分離
  let genchiAmount = 0;
  let onlineAmount = 0;
  if (content === "genchi") {
    genchiAmount = totalAmount;
  } else if (content === "online") {
    onlineAmount = totalAmount;
  } else {
    // 兼: 内訳から現地分を抽出、残りはオンライン
    genchiAmount = br.genchiAmount;
    if (genchiAmount > totalAmount) genchiAmount = 0; // 異常値ガード
    onlineAmount = totalAmount - genchiAmount;
  }

  const key = `${name}|${ym}`;
  if (!byInstrMonth[key]) {
    byInstrMonth[key] = { name, ym, business, total: 0, online: 0, genchi: 0, students: 0, allDone: true, hasIncomplete: false, breakdownText: "" };
  }
  const e = byInstrMonth[key];
  e.total += totalAmount;
  e.online += onlineAmount;
  e.genchi += genchiAmount;
  if (br.students > e.students) e.students = br.students;
  if (!done) { e.allDone = false; e.hasIncomplete = true; }
  e.breakdownText += (e.breakdownText ? "\n---\n" : "") + (breakdownText || "");

  // 事業別月次合計
  const onBiz = business === "宮崎教室" ? "宮崎教室" : business;
  if (onlineAmount > 0) {
    const k = `${onBiz}|${ym}`;
    if (!byBusinessMonth[k]) byBusinessMonth[k] = { business: onBiz, ym, total: 0 };
    byBusinessMonth[k].total += onlineAmount;
  }
  if (genchiAmount > 0) {
    const k = `宮崎教室|${ym}`;
    if (!byBusinessMonth[k]) byBusinessMonth[k] = { business: "宮崎教室", ym, total: 0 };
    byBusinessMonth[k].total += genchiAmount;
  }
}

function processFile(ym, filename) {
  const filepath = path.join(DOWNLOAD_DIR, filename);
  const text = fs.readFileSync(filepath, "utf8");
  const rows = parseCsv(text);
  if (rows.length === 0) return;

  // フォーマット判定: 5月 (section-based) or 新フォーム形式
  const firstLine = rows[0].map((c) => c.replace(/\n/g, " ").trim());
  const isSectionFormat = firstLine[0] === "オンライン" && firstLine[1] === "振込金額";

  if (isSectionFormat) {
    // 5月.csv: 2 sections (オンライン / 現地)
    let section = "online";
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length < 3) continue;
      if (r[0] === "現地" && r[1] === "振込金額") { section = "genchi"; continue; }
      if (r.every((c) => !c.trim())) continue;
      const name = r[0];
      const amount = parseAmount(r[1]);
      const done = String(r[2]).toUpperCase() === "TRUE";
      const breakdown = r[4] || "";
      if (!name.trim()) continue;
      if (amount === 0) { skipped.push({ ym, name, reason: "金額0" }); continue; }
      // 旧format: 現地section→genchi、オンラインsection→内訳に現地時間あれば兼業(both)
      let content;
      if (section === "genchi") content = "genchi";
      else {
        const br = parseBreakdown(breakdown);
        content = br.genchiHours > 0 ? "both" : "online";
      }
      addRecord(name, ym, amount, breakdown, content, done);
    }
  } else {
    // 新フォーム形式
    const header = firstLine;
    const idxName = header.findIndex((h) => h.includes("お名前") || h === "名前");
    const idxDone = header.findIndex((h) => h.includes("完了") || h.includes("振込完了"));
    const idxAmount = header.findIndex((h) => h.includes("合計金額") || h === "金額" || h === "振込金額");
    const idxContent = header.findIndex((h) => h.includes("バイト内容"));
    const idxBreakdown = header.findIndex((h) => h.includes("内訳"));
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length < Math.max(idxName, idxAmount) + 1) continue;
      const name = (r[idxName] || "").trim();
      if (!name) continue;
      const amount = parseAmount(r[idxAmount]);
      const done = idxDone >= 0 ? String(r[idxDone]).toUpperCase() === "TRUE" : true;
      const content_s = idxContent >= 0 ? r[idxContent] : "";
      const breakdown = idxBreakdown >= 0 ? r[idxBreakdown] : "";
      if (amount === 0) { skipped.push({ ym, name, reason: "金額0" }); continue; }
      const content = detectContent(content_s, breakdown, null);
      addRecord(name, ym, amount, breakdown, content, done);
    }
  }
}

for (const { ym, file } of FILES) {
  processFile(ym, file);
}

// 結果出力
const records = Object.values(byInstrMonth).sort((a, b) => {
  if (a.name !== b.name) return a.name.localeCompare(b.name, "ja");
  return a.ym.localeCompare(b.ym);
});
const businessMonth = Object.values(byBusinessMonth).sort((a, b) => {
  if (a.ym !== b.ym) return a.ym.localeCompare(b.ym);
  return a.business.localeCompare(b.business, "ja");
});

const result = { records, businessMonth, skipped, unmapped: Array.from(unmapped) };
fs.writeFileSync("scripts/baito-parsed.json", JSON.stringify(result, null, 2));
console.log("=== 事業×月 集計 ===");
for (const b of businessMonth) {
  console.log(`${b.ym} ${b.business}: ¥${b.total.toLocaleString()}`);
}
console.log("\n=== 未マッピング講師（白谷塾オンラインとして処理） ===");
console.log(Array.from(unmapped).join(", "));
console.log("\n=== スキップ ===");
console.log(skipped.length + " 件");
console.log(`\n保存: scripts/baito-parsed.json (${records.length} 件)`);
