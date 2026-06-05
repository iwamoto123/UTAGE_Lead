import type { MonthlyPL } from "./types";

export type MonthStatus = "submitted" | "pending" | "missing" | "future" | "exempt";

/**
 * 対象月×事業の入力状況を判定する
 * 優先順位:
 * - 値が1つでも入っている → submitted（免除フラグより優先）
 * - 値なし & 免除フラグON → exempt
 * - 値なし & 免除フラグOFF & 締切前 → pending
 * - 値なし & 免除フラグOFF & 締切後 → missing
 * - 対象月が当月以降 → future
 */
export function judgeMonthStatus(records: MonthlyPL[], ym: string, today = new Date()): MonthStatus {
  if (!ym) return "future";
  const [yStr, mStr] = ym.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const target1st = new Date(y, m - 1, 1);
  const today1st = new Date(today.getFullYear(), today.getMonth(), 1);
  if (target1st >= today1st) return "future";

  const dueDate = new Date(y, m, 5);

  const hasValue = records.some((r) =>
    r.uriage + r.kyozaiUriage + r.tankiUriage + r.sonotaUriage > 0 ||
    r.kyozaiGenka > 0 ||
    r.jinkenhiBaito + r.shainKyuyo + r.gyoumuItaku > 0 ||
    r.kokokuhi > 0 || r.kokokuhiCard > 0 ||
    r.jidaiKachin + r.suidoKonetsu + r.tsushin + r.saas + r.gaichu +
      r.shiharaiTesuryo + r.riasu + r.genka + r.sonotaKeihi > 0
  );

  // 1) 値があれば submitted（免除フラグより優先）
  if (hasValue) return "submitted";

  // 2) 値なし & 免除フラグあり → exempt
  if (records.some((r) => r.datalessExempt)) return "exempt";

  // 3) 値なし & 免除なし → 期限判定
  return today >= dueDate ? "missing" : "pending";
}
