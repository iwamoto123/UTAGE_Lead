import type { MonthlyPL } from "@/lib/types";
import { manen } from "@/lib/format";
import { judgeMonthStatus, type MonthStatus } from "@/lib/status";

interface Props {
  rows: MonthlyPL[];
  months: string[];
}

function computeSeries(rows: MonthlyPL[], months: string[]) {
  const byMonthBiz = new Map<string, Map<string, { sales: number; profit: number }>>();
  for (const r of rows) {
    if (!byMonthBiz.has(r.yearMonth)) byMonthBiz.set(r.yearMonth, new Map());
    const ym = byMonthBiz.get(r.yearMonth)!;
    const sales = r.uriage + r.kyozaiUriage + r.tankiUriage + r.sonotaUriage;
    const hk = r.jinkenhiBaito + r.shainKyuyo + r.gyoumuItaku +
      r.kokokuhi + r.jidaiKachin + r.suidoKonetsu + r.tsushin +
      r.saas + r.gaichu + r.shiharaiTesuryo + r.riasu + r.genka + r.sonotaKeihi;
    const profit = sales - r.kyozaiGenka - hk;
    const cur = ym.get(r.business) ?? { sales: 0, profit: 0 };
    cur.sales += sales;
    cur.profit += profit;
    ym.set(r.business, cur);
  }
  return months.map((m) => {
    const bizMap = byMonthBiz.get(m) ?? new Map();
    let salesTotal = 0;
    let profitTotal = 0;
    bizMap.forEach((v) => {
      salesTotal += v.sales;
      profitTotal += v.profit;
    });
    return { month: m, sales: salesTotal, profit: profitTotal };
  });
}

// 目盛りに使う「いい感じのステップ」を返す
function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 1;
  const log = Math.floor(Math.log10(rawStep));
  const base = Math.pow(10, log);
  const ratio = rawStep / base;
  let nice: number;
  if (ratio <= 1) nice = 1;
  else if (ratio <= 2) nice = 2;
  else if (ratio <= 2.5) nice = 2.5;
  else if (ratio <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

function buildScale(min: number, max: number, divisions = 4): { ticks: number[]; min: number; max: number } {
  if (max === min) {
    if (max === 0) return { ticks: [0, 25, 50, 75, 100], min: 0, max: 100 };
    max = max + Math.abs(max) * 0.1;
  }
  const range = max - min;
  const step = niceStep(range / divisions);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) {
    ticks.push(Math.round(v));
  }
  return { ticks, min: niceMin, max: niceMax };
}

// 短い月ラベル（2026-04 → 4月）
function shortMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${parseInt(m, 10)}/${y.slice(2)}`;
}

function Chart({ title, series, valueKey, color, statuses }: {
  title: string;
  series: { month: string; sales: number; profit: number }[];
  valueKey: "sales" | "profit";
  color: "blue" | "green-red";
  statuses: Map<string, MonthStatus>;
}) {
  // 集計に含めるのは submitted + exempt（部分データあり可）
  const submittedValues = series
    .filter((s) => {
      const st = statuses.get(s.month);
      return st === "submitted" || st === "exempt";
    })
    .map((s) => s[valueKey]);
  const minV = Math.min(0, ...submittedValues, 0);
  const maxV = Math.max(0, ...submittedValues, 1);
  const scale = buildScale(minV, maxV);
  const range = scale.max - scale.min || 1;
  const zeroPct = ((scale.max - 0) / range) * 100;

  return (
    <div className="bg-white border border-slate-200 rounded p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="flex gap-2">
        {/* Y軸ラベル */}
        <div className="relative w-12 h-48 shrink-0">
          {[...scale.ticks].reverse().map((t, i) => {
            const pct = ((scale.max - t) / range) * 100;
            return (
              <div
                key={i}
                className="absolute right-1 text-[10px] text-slate-500 tabular-nums -translate-y-1/2 whitespace-nowrap"
                style={{ top: `${pct}%` }}
              >
                {manen(t)}
              </div>
            );
          })}
        </div>

        {/* グラフ本体 */}
        <div className="flex-1 relative h-48 border-l border-b border-slate-300">
          {/* グリッドライン */}
          {[...scale.ticks].reverse().map((t, i) => {
            const pct = ((scale.max - t) / range) * 100;
            const isZero = t === 0;
            return (
              <div
                key={i}
                className={`absolute left-0 right-0 border-t ${isZero ? "border-slate-400" : "border-slate-100"}`}
                style={{ top: `${pct}%` }}
              />
            );
          })}

          {/* バー */}
          <div className="absolute inset-0 flex items-stretch gap-1 px-1">
            {series.map((s) => {
              const st = statuses.get(s.month) ?? "submitted";
              const v = s[valueKey];

              // submitted / exempt はバー描画。missing / pending / future はラベル表示
              if (st !== "submitted" && st !== "exempt") {
                const label = st === "missing" ? "未" : st === "pending" ? "?" : "−";
                const labelCls =
                  st === "missing"
                    ? "text-red-600 bg-red-50 border-red-300"
                    : st === "pending"
                      ? "text-amber-700 bg-amber-50 border-amber-300"
                      : "text-slate-400 bg-slate-50 border-slate-200";
                return (
                  <div key={s.month} className="flex-1 relative flex items-end justify-center pb-1">
                    <div className={`text-[10px] font-medium px-1 py-0.5 rounded border ${labelCls}`}>
                      {label}
                    </div>
                  </div>
                );
              }

              const isPositive = v >= 0;
              const heightPct = (Math.abs(v) / range) * 100;
              const topPct = isPositive ? zeroPct - heightPct : zeroPct;
              const barColor = color === "blue"
                ? "bg-blue-500 hover:bg-blue-600"
                : isPositive
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600";
              return (
                <div key={s.month} className="flex-1 relative group">
                  <div
                    className={`absolute left-0 right-0 ${barColor} transition-colors`}
                    style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 0.5)}%` }}
                  />
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20">
                    {manen(v)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X軸ラベル */}
      <div className="flex gap-2 mt-1">
        <div className="w-12 shrink-0" />
        <div className="flex-1 flex gap-1 px-1">
          {series.map((s) => (
            <div key={s.month} className="flex-1 text-center text-[10px] text-slate-500 tabular-nums">
              {shortMonth(s.month)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MonthlyTrendChart({ rows, months }: Props) {
  const series = computeSeries(rows, months);
  const today = new Date();
  const byMonth = new Map<string, MonthlyPL[]>();
  for (const r of rows) {
    if (!byMonth.has(r.yearMonth)) byMonth.set(r.yearMonth, []);
    byMonth.get(r.yearMonth)!.push(r);
  }
  const statuses = new Map<string, MonthStatus>();
  for (const m of months) {
    statuses.set(m, judgeMonthStatus(byMonth.get(m) ?? [], m, today));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Chart title="月次売上推移" series={series} valueKey="sales" color="blue" statuses={statuses} />
      <Chart title="月次営業利益推移" series={series} valueKey="profit" color="green-red" statuses={statuses} />
    </div>
  );
}
