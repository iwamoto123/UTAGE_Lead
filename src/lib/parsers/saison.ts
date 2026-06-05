import iconv from "iconv-lite";

const AD_KEYWORDS = [
  "FACEBK",
  "FACEBOOK",
  "INSTAGRAM",
  "META PLATFORM",
  "META PAYMENTS",
  "GOOGLE ADS",
  "GOOGLE LLC",
  "X CORP",
  "TWITTER",
  "TIKTOK",
];

export interface SaisonRow {
  date: string;       // YYYY/MM/DD
  yearMonth: string;  // YYYY-MM
  shop: string;
  amount: number;
  isAd: boolean;
}

export interface SaisonParseResult {
  payDate: string | null;       // お支払日
  totalAmount: number | null;   // 今回ご請求額
  rows: SaisonRow[];            // 全明細
  adRowsByMonth: Map<string, SaisonRow[]>;  // 月別広告関連明細
  adTotalByMonth: Map<string, number>;       // 月別広告費合計
}

// 単純CSV行パーサー（ダブルクォート対応）
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export function parseSaison(buffer: Buffer): SaisonParseResult {
  // Saison CSV は cp932（Shift_JIS）
  const decoded = iconv.decode(buffer, "cp932");
  const lines = decoded.split(/\r?\n/);

  let payDate: string | null = null;
  let totalAmount: number | null = null;
  const rows: SaisonRow[] = [];

  let headerFound = false;

  for (let i = 0; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 0) continue;

    if (cols[0] === "お支払日" && cols[1]) {
      payDate = cols[1].trim();
      continue;
    }
    if (cols[0] === "今回ご請求額" && cols[1]) {
      totalAmount = parseInt(cols[1].trim(), 10);
      continue;
    }
    if (cols[0] === "利用日") {
      headerFound = true;
      continue;
    }
    if (!headerFound) continue;

    // データ行
    const date = (cols[0] ?? "").trim();
    const shop = (cols[1] ?? "").trim();
    const amountStr = (cols[5] ?? "").trim();

    // 利用日が空の行はスキップ（継続行など）
    if (!date) continue;
    const m = date.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) continue;

    const yearMonth = `${m[1]}-${m[2]}`;
    const amount = parseInt(amountStr, 10);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const shopUpper = shop.toUpperCase();
    const isAd = AD_KEYWORDS.some((kw) => shopUpper.includes(kw));

    rows.push({ date, yearMonth, shop, amount, isAd });
  }

  // 月別広告集計
  const adRowsByMonth = new Map<string, SaisonRow[]>();
  const adTotalByMonth = new Map<string, number>();
  for (const r of rows) {
    if (!r.isAd) continue;
    if (!adRowsByMonth.has(r.yearMonth)) adRowsByMonth.set(r.yearMonth, []);
    adRowsByMonth.get(r.yearMonth)!.push(r);
    adTotalByMonth.set(r.yearMonth, (adTotalByMonth.get(r.yearMonth) ?? 0) + r.amount);
  }

  return { payDate, totalAmount, rows, adRowsByMonth, adTotalByMonth };
}
