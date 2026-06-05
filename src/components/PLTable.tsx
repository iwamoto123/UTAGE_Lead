import type { MonthlyPL } from "@/lib/types";
import { yen, yearMonthJP } from "@/lib/format";
import { judgeMonthStatus, type MonthStatus } from "@/lib/status";

interface Row {
  label: string;
  key: keyof MonthlyPL | "売上合計" | "人件費合計" | "販管費合計" | "売上総利益" | "営業利益" | "営業利益率";
  level: 0 | 1;
  sign?: "plus" | "minus";
}

const ROWS: Row[] = [
  { label: "売上", key: "売上合計", level: 0, sign: "plus" },
  { label: "　月謝売上", key: "uriage", level: 1, sign: "plus" },
  { label: "　教材売上", key: "kyozaiUriage", level: 1, sign: "plus" },
  { label: "　短期講座売上", key: "tankiUriage", level: 1, sign: "plus" },
  { label: "　その他売上", key: "sonotaUriage", level: 1, sign: "plus" },
  { label: "売上原価", key: "kyozaiGenka", level: 0, sign: "minus" },
  { label: "売上総利益", key: "売上総利益", level: 0 },
  { label: "販管費", key: "販管費合計", level: 0, sign: "minus" },
  { label: "　人件費（バイト代）", key: "jinkenhiBaito", level: 1, sign: "minus" },
  { label: "　社員給与", key: "shainKyuyo", level: 1, sign: "minus" },
  { label: "　業務委託費", key: "gyoumuItaku", level: 1, sign: "minus" },
  { label: "　広告費", key: "kokokuhi", level: 1, sign: "minus" },
  { label: "　地代家賃", key: "jidaiKachin", level: 1, sign: "minus" },
  { label: "　水道光熱費", key: "suidoKonetsu", level: 1, sign: "minus" },
  { label: "　通信費", key: "tsushin", level: 1, sign: "minus" },
  { label: "　SaaS利用料", key: "saas", level: 1, sign: "minus" },
  { label: "　外注費", key: "gaichu", level: 1, sign: "minus" },
  { label: "　支払手数料", key: "shiharaiTesuryo", level: 1, sign: "minus" },
  { label: "　リース料", key: "riasu", level: 1, sign: "minus" },
  { label: "　減価償却費", key: "genka", level: 1, sign: "minus" },
  { label: "　その他経費", key: "sonotaKeihi", level: 1, sign: "minus" },
  { label: "営業利益", key: "営業利益", level: 0 },
];

function computed(r: MonthlyPL, key: Row["key"]): number {
  switch (key) {
    case "売上合計":
      return r.uriage + r.kyozaiUriage + r.tankiUriage + r.sonotaUriage;
    case "人件費合計":
      return r.jinkenhiBaito + r.shainKyuyo + r.gyoumuItaku;
    case "販管費合計":
      return r.jinkenhiBaito + r.shainKyuyo + r.gyoumuItaku +
        r.kokokuhi + r.jidaiKachin + r.suidoKonetsu + r.tsushin +
        r.saas + r.gaichu + r.shiharaiTesuryo + r.riasu + r.genka + r.sonotaKeihi;
    case "売上総利益": {
      const u = r.uriage + r.kyozaiUriage + r.tankiUriage + r.sonotaUriage;
      return u - r.kyozaiGenka;
    }
    case "営業利益": {
      const u = r.uriage + r.kyozaiUriage + r.tankiUriage + r.sonotaUriage;
      const hk = r.jinkenhiBaito + r.shainKyuyo + r.gyoumuItaku +
        r.kokokuhi + r.jidaiKachin + r.suidoKonetsu + r.tsushin +
        r.saas + r.gaichu + r.shiharaiTesuryo + r.riasu + r.genka + r.sonotaKeihi;
      return u - r.kyozaiGenka - hk;
    }
    default:
      return (r as any)[key] ?? 0;
  }
}

const STATUS_HEADER_STYLE: Record<MonthStatus, string> = {
  submitted: "bg-slate-100",
  pending: "bg-slate-100",
  missing: "bg-red-100 text-red-700",
  exempt: "bg-slate-200 text-slate-600",
  future: "bg-slate-50 text-slate-400",
};

const STATUS_BADGE: Record<MonthStatus, { text: string; cls: string } | null> = {
  submitted: null,
  pending: { text: "入力中", cls: "bg-amber-100 text-amber-700 border-amber-300" },
  missing: { text: "未提出", cls: "bg-red-200 text-red-800 border-red-400" },
  exempt: { text: "データなし", cls: "bg-slate-200 text-slate-700 border-slate-400" },
  future: null,
};

const STATUS_CELL_BG: Record<MonthStatus, string> = {
  submitted: "",
  pending: "bg-amber-50/40",
  missing: "bg-red-50",
  exempt: "bg-slate-100/50",
  future: "bg-slate-50/50",
};

export default function PLTable({ rows, months }: { rows: MonthlyPL[]; months: string[] }) {
  const today = new Date();
  const byMonth = new Map<string, MonthlyPL[]>();
  for (const r of rows) {
    if (!byMonth.has(r.yearMonth)) byMonth.set(r.yearMonth, []);
    byMonth.get(r.yearMonth)!.push(r);
  }
  const monthStatus = new Map<string, MonthStatus>();
  for (const m of months) {
    monthStatus.set(m, judgeMonthStatus(byMonth.get(m) ?? [], m, today));
  }

  function sumForMonth(ym: string, key: Row["key"]): number {
    const rs = byMonth.get(ym) ?? [];
    return rs.reduce((acc, r) => acc + computed(r, key), 0);
  }

  // 合計には submitted + exempt の月を含める（部分データありの「データなし」月も含む）
  function total(key: Row["key"]): number {
    let sum = 0;
    for (const m of months) {
      const st = monthStatus.get(m);
      if (st === "submitted" || st === "exempt") {
        sum += sumForMonth(m, key);
      }
    }
    return sum;
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded bg-white">
      <table className="text-sm w-full">
        <thead className="bg-slate-100 sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-slate-100 z-10 min-w-[180px]">
              勘定科目
            </th>
            {months.map((m) => {
              const st = monthStatus.get(m) ?? "submitted";
              const badge = STATUS_BADGE[st];
              return (
                <th key={m} className={`text-right px-3 py-2 font-semibold whitespace-nowrap ${STATUS_HEADER_STYLE[st]}`}>
                  <div className="flex flex-col items-end gap-1">
                    <span>{yearMonthJP(m)}</span>
                    {badge && (
                      <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${badge.cls}`}>
                        {badge.text}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
            <th className="text-right px-3 py-2 font-semibold bg-slate-200 whitespace-nowrap">
              合計
              <div className="text-[10px] font-normal text-slate-500">（提出済みのみ）</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => {
            const isSection = row.level === 0;
            const isProfit = row.key === "売上総利益" || row.key === "営業利益";
            return (
              <tr key={i} className={`border-t border-slate-100 ${isSection ? "font-bold bg-slate-50" : ""}`}>
                <td className={`px-3 py-1.5 sticky left-0 z-10 ${isSection ? "bg-slate-50" : "bg-white"}`}>
                  {row.label}
                </td>
                {months.map((m) => {
                  const st = monthStatus.get(m) ?? "submitted";
                  const cellBg = STATUS_CELL_BG[st];
                  const v = sumForMonth(m, row.key);
                  // 未提出/入力中の月は値の代わりに記号
                  if (st === "missing") {
                    return (
                      <td key={m} className={`text-right px-3 py-1.5 whitespace-nowrap text-red-500 font-medium ${cellBg}`}>
                        未
                      </td>
                    );
                  }
                  if (st === "exempt") {
                    // 部分的にデータがある可能性があるので値を表示
                    return (
                      <td key={m} className={`text-right px-3 py-1.5 whitespace-nowrap tabular-nums text-slate-600 ${cellBg}`} title="一部データなし（確認済み）">
                        {v === 0 ? <span className="text-slate-300">−</span> : yen(v)}
                      </td>
                    );
                  }
                  if (st === "pending") {
                    return (
                      <td key={m} className={`text-right px-3 py-1.5 whitespace-nowrap text-amber-600 ${cellBg}`}>
                        ?
                      </td>
                    );
                  }
                  if (st === "future") {
                    return (
                      <td key={m} className={`text-right px-3 py-1.5 whitespace-nowrap text-slate-300 ${cellBg}`}>
                        −
                      </td>
                    );
                  }
                  // submitted
                  return (
                    <td key={m} className={`text-right px-3 py-1.5 whitespace-nowrap tabular-nums ${
                      isProfit && v < 0 ? "text-red-600" : ""
                    } ${cellBg}`}>
                      {v === 0 ? <span className="text-slate-300">0</span> : yen(v)}
                    </td>
                  );
                })}
                <td className={`text-right px-3 py-1.5 font-semibold bg-slate-100 whitespace-nowrap tabular-nums ${
                  isProfit && total(row.key) < 0 ? "text-red-600" : ""
                }`}>
                  {total(row.key) === 0 ? <span className="text-slate-300">0</span> : yen(total(row.key))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
