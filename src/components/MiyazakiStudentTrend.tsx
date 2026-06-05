import type { MonthlyPL } from "@/lib/types";
import { judgeMonthStatus, type MonthStatus } from "@/lib/status";

interface Props {
  rows: MonthlyPL[];
  months: string[];
}

type SeriesPoint = {
  month: string;
  kou1: number;
  kou2: number;
  kou3: number;
  unknown: number;
  total: number;
  status: MonthStatus;
};

type GradeKey = "kou1" | "kou2" | "kou3" | "unknown";

const SEGMENTS: { key: GradeKey; label: string; color: string; dot: string }[] = [
  { key: "kou1", label: "高1", color: "bg-sky-400", dot: "bg-sky-400" },
  { key: "kou2", label: "高2", color: "bg-emerald-500", dot: "bg-emerald-500" },
  { key: "kou3", label: "高3", color: "bg-[#458BC3]", dot: "bg-[#458BC3]" },
  { key: "unknown", label: "未分類", color: "bg-slate-300", dot: "bg-slate-300" },
];

function formatCount(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")}人`;
}

function formatDelta(value: number | null): string {
  if (value === null) return "前月なし";
  if (value === 0) return "前月比 ±0";
  return `前月比 ${value > 0 ? "+" : ""}${Math.round(value).toLocaleString("ja-JP")}人`;
}

function shortMonth(ym: string): string {
  const [year, month] = ym.split("-");
  return `${parseInt(month, 10)}/${year.slice(2)}`;
}

function statusLabel(status: MonthStatus): string {
  if (status === "missing") return "未";
  if (status === "pending") return "?";
  if (status === "future") return "-";
  return "0";
}

function buildSeries(rows: MonthlyPL[], months: string[]): SeriesPoint[] {
  const miyazakiRows = rows.filter((r) => r.business === "宮崎教室");
  const rowsByMonth = new Map<string, MonthlyPL[]>();
  for (const r of miyazakiRows) {
    if (!rowsByMonth.has(r.yearMonth)) rowsByMonth.set(r.yearMonth, []);
    rowsByMonth.get(r.yearMonth)!.push(r);
  }

  return months.map((month) => {
    const monthRows = rowsByMonth.get(month) ?? [];
    let kou1 = 0;
    let kou2 = 0;
    let kou3 = 0;
    let reportedTotal = 0;

    for (const r of monthRows) {
      kou1 += r.kou1Ninzu;
      kou2 += r.kou2Ninzu;
      kou3 += r.kou3Ninzu;
      const gradeTotal = r.kou1Ninzu + r.kou2Ninzu + r.kou3Ninzu;
      reportedTotal += r.seitoSu > 0 ? r.seitoSu : gradeTotal;
    }

    const gradeTotal = kou1 + kou2 + kou3;
    const total = Math.max(reportedTotal, gradeTotal);
    return {
      month,
      kou1,
      kou2,
      kou3,
      unknown: Math.max(0, total - gradeTotal),
      total,
      status: judgeMonthStatus(monthRows, month),
    };
  });
}

function buildTicks(maxValue: number): number[] {
  const step = Math.max(1, Math.ceil(maxValue / 4));
  const top = step * 4;
  return [top, step * 3, step * 2, step, 0];
}

function StudentStatCard({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: number;
  delta: number | null;
  tone: "brand" | "sky" | "green" | "slate";
}) {
  const toneClass = {
    brand: "border-l-[#458BC3] bg-[#eef6fb]",
    sky: "border-l-sky-400 bg-sky-50",
    green: "border-l-emerald-500 bg-emerald-50",
    slate: "border-l-slate-500 bg-slate-50",
  }[tone];
  const deltaClass =
    delta === null || delta === 0 ? "text-slate-500" : delta > 0 ? "text-emerald-700" : "text-red-600";

  return (
    <div className={`rounded border border-slate-200 border-l-4 ${toneClass} p-4 shadow-sm`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{formatCount(value)}</div>
      <div className={`text-xs mt-1 tabular-nums ${deltaClass}`}>{formatDelta(delta)}</div>
    </div>
  );
}

export default function MiyazakiStudentTrend({ rows, months }: Props) {
  const series = buildSeries(rows, months);
  const latestIndex = (() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].total > 0) return i;
    }
    return -1;
  })();
  const latest = latestIndex >= 0 ? series[latestIndex] : null;
  const previous = latestIndex > 0 ? series[latestIndex - 1] : null;
  const maxTotal = Math.max(1, ...series.map((s) => s.total));
  const ticks = buildTicks(maxTotal);
  const scaleMax = ticks[0] || 1;
  const hasUnknown = series.some((s) => s.unknown > 0);
  const visibleSegments = hasUnknown ? SEGMENTS : SEGMENTS.filter((s) => s.key !== "unknown");

  if (series.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">宮崎教室 生徒数推移</h2>
          <p className="text-sm text-slate-600">高1・高2・高3の在籍数を月別に表示</p>
        </div>
        <div className="text-xs text-slate-500">
          直近データ: <span className="font-semibold text-slate-700">{latest?.month ?? "-"}</span>
        </div>
      </div>

      {latest ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StudentStatCard
            label="生徒数 合計"
            value={latest.total}
            delta={previous ? latest.total - previous.total : null}
            tone="slate"
          />
          <StudentStatCard
            label="高1"
            value={latest.kou1}
            delta={previous ? latest.kou1 - previous.kou1 : null}
            tone="sky"
          />
          <StudentStatCard
            label="高2"
            value={latest.kou2}
            delta={previous ? latest.kou2 - previous.kou2 : null}
            tone="green"
          />
          <StudentStatCard
            label="高3"
            value={latest.kou3}
            delta={previous ? latest.kou3 - previous.kou3 : null}
            tone="brand"
          />
        </div>
      ) : (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          この期間には宮崎教室の生徒数データが入っていません。
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h3 className="text-sm font-semibold text-slate-900">月別 生徒数の変化</h3>
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600">
            {visibleSegments.map((segment) => (
              <span key={segment.key} className="inline-flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-sm ${segment.dot}`} />
                {segment.label}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[560px]" style={{ minWidth: `${Math.max(560, series.length * 48)}px` }}>
            <div className="flex gap-2">
              <div className="relative h-56 w-10 shrink-0">
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    className="absolute right-1 -translate-y-1/2 text-[10px] text-slate-500 tabular-nums"
                    style={{ top: `${((scaleMax - tick) / scaleMax) * 100}%` }}
                  >
                    {tick}
                  </div>
                ))}
              </div>

              <div className="relative h-56 flex-1 border-l border-b border-slate-300">
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    className={`absolute left-0 right-0 border-t ${tick === 0 ? "border-slate-300" : "border-slate-100"}`}
                    style={{ top: `${((scaleMax - tick) / scaleMax) * 100}%` }}
                  />
                ))}

                <div className="absolute inset-0 flex items-end gap-2 px-2">
                  {series.map((point) => {
                    const heightPct = (point.total / scaleMax) * 100;
                    return (
                      <div key={point.month} className="relative flex h-full flex-1 items-end justify-center group">
                        {point.total > 0 ? (
                          <>
                            <div
                              className="flex w-full max-w-10 min-w-5 flex-col-reverse overflow-hidden rounded-t border border-white/70 bg-slate-100"
                              style={{ height: `${Math.max(heightPct, 3)}%` }}
                            >
                              {visibleSegments.map((segment) => {
                                const value = point[segment.key];
                                if (value <= 0) return null;
                                return (
                                  <div
                                    key={segment.key}
                                    className={segment.color}
                                    style={{ height: `${(value / point.total) * 100}%` }}
                                  />
                                );
                              })}
                            </div>
                            <div className="absolute -top-11 left-1/2 z-20 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 whitespace-nowrap">
                              {point.month} 合計 {formatCount(point.total)}
                            </div>
                          </>
                        ) : (
                          <div className="mb-1 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium text-slate-400">
                            {statusLabel(point.status)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <div className="w-10 shrink-0" />
              <div className="flex flex-1 gap-2 px-2">
                {series.map((point) => (
                  <div key={point.month} className="flex-1 text-center text-[10px] text-slate-500 tabular-nums">
                    {shortMonth(point.month)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {hasUnknown && (
          <div className="mt-3 text-xs text-slate-500">
            生徒数合計と高1・高2・高3の合計に差がある月は、差分を未分類として表示しています。
          </div>
        )}
      </div>
    </section>
  );
}
