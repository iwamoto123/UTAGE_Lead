import type { ScenarioSummary, DailySeriesPoint } from "@/lib/marketing";

interface Props {
  dailyTotals: { date: string; metaAd: number; metaAdMerged: number; youtube: number; sns: number; hpBlog: number; officialLine: number; reservation: number }[];
  dailyByScenario: Record<string, DailySeriesPoint[]>;
  scenarios: ScenarioSummary[];
}

export default function LeadsDailyChart({ dailyTotals, dailyByScenario, scenarios }: Props) {
  // 全体スタックバー: 純リードの経路カテゴリ別
  const allDates = [...new Set([
    ...dailyTotals.map((d) => d.date),
  ])].sort();

  const W = Math.max(720, allDates.length * 30);
  const H = 280;
  const padL = 50, padR = 12, padT = 20, padB = 40;
  const maxY = Math.max(1, ...dailyTotals.map((d) =>
    d.metaAd + d.youtube + d.sns + d.hpBlog + d.officialLine
  ));
  const yScale = (v: number) => ((H - padT - padB) * v) / maxY;
  const barW = allDates.length > 0 ? Math.max(8, Math.min(24, (W - padL - padR) / allDates.length - 4)) : 16;
  const xAt = (i: number) => padL + (i + 0.5) * ((W - padL - padR) / Math.max(1, allDates.length));

  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => Math.round((maxY / yTickCount) * i));

  const PURE_CATEGORIES = new Set(["メタ広告", "YouTube自然流入", "SNS自然流入", "HP/ブログ", "公式LINE"]);
  // トップ5シナリオの折れ線（純リード経路のみ）
  const topScenarios = scenarios.filter((s) => PURE_CATEGORIES.has(s.category)).slice(0, 5);
  const lineColors = ["#458BC3", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];
  const auxiliaryMaxY = Math.max(1, ...dailyTotals.map((d) => d.metaAdMerged + d.reservation));
  const AUX_H = 96;
  const auxPadT = 16, auxPadB = 26;
  const auxYScale = (v: number) => ((AUX_H - auxPadT - auxPadB) * v) / auxiliaryMaxY;

  function pathFor(points: DailySeriesPoint[]): string {
    if (points.length === 0) return "";
    const lookup = new Map(points.map((p) => [p.date, p.value]));
    const segments: string[] = [];
    let pen = "M";
    allDates.forEach((d, i) => {
      const v = lookup.get(d);
      if (v === undefined) { pen = "M"; return; }
      const x = xAt(i);
      const y = H - padB - yScale(v);
      segments.push(`${pen} ${x.toFixed(1)} ${y.toFixed(1)}`);
      pen = "L";
    });
    return segments.join(" ");
  }

  // X軸ラベル間引き
  const labelStep = Math.max(1, Math.ceil(allDates.length / 18));

  return (
    <section className="bg-white border border-slate-200 rounded">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-bold">日別リード推移</h2>
        <p className="text-[10px] text-slate-500 mt-0.5">主グラフは純リードのみ。メタ広告(合流)と面談予約は下段の補助指標に分離</p>
      </div>

      {allDates.length === 0 ? (
        <div className="text-xs text-slate-400 py-8 text-center">期間内のデータがありません</div>
      ) : (
        <div className="overflow-x-auto px-3 py-3">
          <svg width={W} height={H} className="text-[10px]">
            {/* Y軸グリッド */}
            {yTicks.map((v, ti) => {
              const y = H - padB - yScale(v);
              return (
                <g key={`yt-${ti}`}>
                  <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                  <text x={padL - 6} y={y + 3} textAnchor="end" fill="#94a3b8">{v.toLocaleString()}</text>
                </g>
              );
            })}

            {/* 積み上げバー */}
            {allDates.map((d, i) => {
              const t = dailyTotals.find((x) => x.date === d)
                ?? { date: d, metaAd: 0, metaAdMerged: 0, youtube: 0, sns: 0, hpBlog: 0, officialLine: 0, reservation: 0 };
              const x = xAt(i) - barW / 2;
              let yCur = H - padB;
              const segs = [
                { v: t.metaAd, color: "#458BC3", label: "メタ広告" },
                { v: t.youtube, color: "#ef4444", label: "YouTube" },
                { v: t.sns, color: "#a855f7", label: "SNS" },
                { v: t.hpBlog, color: "#06b6d4", label: "HP/ブログ" },
                { v: t.officialLine, color: "#10b981", label: "公式LINE" },
              ];
              return (
                <g key={d}>
                  {segs.map((s, j) => {
                    if (s.v === 0) return null;
                    const h = yScale(s.v);
                    yCur -= h;
                    return <rect key={j} x={x} y={yCur} width={barW} height={h} fill={s.color}>
                      <title>{`${d} ${s.label}: ${s.v}`}</title>
                    </rect>;
                  })}
                  {i % labelStep === 0 && (
                    <text x={xAt(i)} y={H - padB + 14} textAnchor="middle" fill="#64748b" fontSize="9">
                      {d.slice(5).replace("-", "/")}
                    </text>
                  )}
                </g>
              );
            })}

            {/* シナリオ折れ線 */}
            {topScenarios.map((s, idx) => {
              const k = `${s.accountId}|${s.scenarioId}`;
              const points = dailyByScenario[k] ?? [];
              if (points.length === 0) return null;
              return (
                <g key={k} className="pointer-events-none">
                  <path d={pathFor(points)} fill="none" stroke={lineColors[idx]} strokeWidth="2" strokeLinejoin="round" strokeOpacity="0.7" />
                  {points.map((p, j) => {
                    const idx2 = allDates.indexOf(p.date);
                    if (idx2 < 0) return null;
                    return <circle key={j} cx={xAt(idx2)} cy={H - padB - yScale(p.value)} r={2.5} fill={lineColors[idx]} stroke="#fff" strokeWidth="0.8" />;
                  })}
                </g>
              );
            })}
          </svg>

          {/* 凡例 */}
          <div className="text-[10px] mt-2 space-y-1">
            <div className="flex gap-3 flex-wrap items-center">
              <span className="text-slate-500 font-bold">バー:</span>
              <Legend color="#458BC3">メタ広告</Legend>
              <Legend color="#ef4444">YouTube</Legend>
              <Legend color="#a855f7">SNS</Legend>
              <Legend color="#06b6d4">HP/ブログ</Legend>
              <Legend color="#10b981">公式LINE</Legend>
            </div>
            {topScenarios.length > 0 && (
              <div className="flex gap-3 flex-wrap items-center">
                <span className="text-slate-500 font-bold">折れ線（Top5）:</span>
                {topScenarios.map((s, i) => (
                  <Legend key={`${s.accountId}|${s.scenarioId}`} color={lineColors[i]} line>
                    {s.accountName.replace(/【.*?】/, "").slice(0, 18)} / {s.scenarioName.slice(0, 18) || "—"}
                  </Legend>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-[10px] font-bold text-slate-500">補助指標（日別・純リード除外）</div>
              <div className="flex gap-3 text-[10px]">
                <Legend color="#f59e0b">面談予約</Legend>
                <Legend color="#bfdbfe">メタ広告(合流)</Legend>
              </div>
            </div>
            <svg width={W} height={AUX_H} className="text-[10px]">
              {[0, auxiliaryMaxY].map((v, ti) => {
                const y = AUX_H - auxPadB - auxYScale(v);
                return (
                  <g key={`auxyt-${ti}`}>
                    <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                    <text x={padL - 6} y={y + 3} textAnchor="end" fill="#94a3b8">{v.toLocaleString()}</text>
                  </g>
                );
              })}
              {allDates.map((d, i) => {
                const t = dailyTotals.find((x) => x.date === d)
                  ?? { date: d, metaAd: 0, metaAdMerged: 0, youtube: 0, sns: 0, hpBlog: 0, officialLine: 0, reservation: 0 };
                const x = xAt(i) - barW / 2;
                let yCur = AUX_H - auxPadB;
                const segs = [
                  { v: t.reservation, color: "#f59e0b", label: "面談予約" },
                  { v: t.metaAdMerged, color: "#bfdbfe", label: "メタ広告(合流)" },
                ];
                return (
                  <g key={d}>
                    {segs.map((s, j) => {
                      if (s.v === 0) return null;
                      const h = auxYScale(s.v);
                      yCur -= h;
                      return <rect key={j} x={x} y={yCur} width={barW} height={h} fill={s.color}>
                        <title>{d} {s.label}: {s.v}</title>
                      </rect>;
                    })}
                    {i % labelStep === 0 && (
                      <text x={xAt(i)} y={AUX_H - auxPadB + 14} textAnchor="middle" fill="#64748b" fontSize="9">
                        {d.slice(5).replace("-", "/")}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}

function Legend({ color, line, children }: { color: string; line?: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      {line ? (
        <svg width={14} height={6}><line x1="0" y1="3" x2="14" y2="3" stroke={color} strokeWidth="2" /></svg>
      ) : (
        <span className="inline-block w-3 h-3" style={{ backgroundColor: color }} />
      )}
      <span>{children}</span>
    </span>
  );
}
