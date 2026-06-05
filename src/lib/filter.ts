import type { MonthlyPL } from "./types";

export type PeriodKey =
  | "current_month"
  | "last_month"
  | "current_year"
  | "last_year"
  | "all"
  | "custom";

export interface PeriodRange {
  fromYM: string; // YYYY-MM (inclusive)
  toYM: string;   // YYYY-MM (inclusive)
  label: string;
}

export function isValidYM(ym: string | undefined | null): ym is string {
  return typeof ym === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym);
}

export function formatRangeLabel(fromYM: string, toYM: string): string {
  const [fy, fm] = fromYM.split("-");
  const [ty, tm] = toYM.split("-");
  if (fromYM === toYM) return `${fy}年${parseInt(fm, 10)}月`;
  return `${fy}年${parseInt(fm, 10)}月〜${ty}年${parseInt(tm, 10)}月`;
}

export function getPeriodRange(key: PeriodKey, today = new Date(), customFrom?: string, customTo?: string): PeriodRange {
  const y = today.getFullYear();
  const m = today.getMonth() + 1; // 1-12
  const yyyymm = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, "0")}`;

  // 令和8年度 = 2026-04 〜 2027-03
  // 令和7年度 = 2025-04 〜 2026-03
  function fiscalYearRange(fy: number): { from: string; to: string } {
    return { from: `${fy}-04`, to: `${fy + 1}-03` };
  }

  // 現在の和暦年度を判定
  const reiwa = y >= 2026 ? (m >= 4 ? "R8" : "R7") : y >= 2025 ? (m >= 4 ? "R7" : "R6") : "R6";
  const currentFY = reiwa === "R8" ? 2026 : reiwa === "R7" ? 2025 : 2024;

  switch (key) {
    case "current_month": {
      const ym = yyyymm(y, m);
      return { fromYM: ym, toYM: ym, label: `${y}年${m}月` };
    }
    case "last_month": {
      const d = new Date(y, m - 2, 1);
      const ym = yyyymm(d.getFullYear(), d.getMonth() + 1);
      return { fromYM: ym, toYM: ym, label: `${d.getFullYear()}年${d.getMonth() + 1}月` };
    }
    case "current_year": {
      const r = fiscalYearRange(currentFY);
      return { fromYM: r.from, toYM: r.to, label: `${reiwa}年度（${r.from}〜${r.to}）` };
    }
    case "last_year": {
      const r = fiscalYearRange(currentFY - 1);
      const prevReiwa = reiwa === "R8" ? "R7" : reiwa === "R7" ? "R6" : "R5";
      return { fromYM: r.from, toYM: r.to, label: `${prevReiwa}年度（${r.from}〜${r.to}）` };
    }
    case "custom": {
      const from = isValidYM(customFrom) ? customFrom : `${currentFY}-04`;
      const to = isValidYM(customTo) ? customTo : `${currentFY + 1}-03`;
      const [a, b] = from <= to ? [from, to] : [to, from];
      return { fromYM: a, toYM: b, label: formatRangeLabel(a, b) };
    }
    case "all":
    default:
      return { fromYM: "2025-04", toYM: "2099-12", label: "全期間" };
  }
}

export function filterByPeriod(rows: MonthlyPL[], range: PeriodRange): MonthlyPL[] {
  return rows.filter((r) => r.yearMonth && r.yearMonth >= range.fromYM && r.yearMonth <= range.toYM);
}

export function filterByBusiness(rows: MonthlyPL[], biz: "all" | "宮崎教室" | "白谷塾オンライン" | "ローカルメディ"): MonthlyPL[] {
  if (biz === "all") return rows;
  return rows.filter((r) => r.business === biz);
}
