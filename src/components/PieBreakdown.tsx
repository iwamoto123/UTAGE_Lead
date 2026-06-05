import { yen, pct } from "@/lib/format";

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  title: string;
  slices: PieSlice[];
  totalLabel?: string;
}

export default function PieBreakdown({ title, slices, totalLabel = "合計" }: Props) {
  const validSlices = slices.filter((s) => s.value > 0);
  const total = validSlices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded p-4">
        <h3 className="font-bold text-sm mb-3">{title}</h3>
        <div className="text-xs text-slate-400 py-8 text-center">データなし</div>
      </div>
    );
  }

  // SVG arc 計算（角度はラジアン、12時方向起点で時計回り）
  const cx = 50;
  const cy = 50;
  const r = 40;
  let cumulative = 0;

  const arcs = validSlices.map((s) => {
    const startRatio = cumulative / total;
    cumulative += s.value;
    const endRatio = cumulative / total;
    // 12時方向(-90°)を 0 起点に
    const startAngle = startRatio * 2 * Math.PI - Math.PI / 2;
    const endAngle = endRatio * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endRatio - startRatio > 0.5 ? 1 : 0;
    // 全1要素の場合はcircle扱い
    const path = validSlices.length === 1
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...s, path, ratio: s.value / total };
  });

  return (
    <div className="bg-white border border-slate-200 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">{title}</h3>
        <div className="text-right">
          <div className="text-[10px] text-slate-500">{totalLabel}</div>
          <div className="text-sm font-bold">{yen(total)}</div>
        </div>
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
        {/* 円グラフ */}
        <svg viewBox="0 0 100 100" className="w-full" aria-label={title}>
          {arcs.map((a, i) => (
            <path key={i} d={a.path} fill={a.color}>
              <title>{a.label}: {yen(a.value)} ({pct(a.ratio)})</title>
            </path>
          ))}
        </svg>

        {/* 凡例 */}
        <ul className="text-xs space-y-1">
          {arcs
            .sort((a, b) => b.value - a.value)
            .map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: a.color }}
                />
                <span className="flex-1 truncate">{a.label}</span>
                <span className="tabular-nums text-slate-600 text-[10px]">{pct(a.ratio)}</span>
                <span className="tabular-nums font-medium w-24 text-right">{yen(a.value)}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
