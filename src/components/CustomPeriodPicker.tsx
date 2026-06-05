"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  business: string;
  initialFrom: string; // YYYY-MM
  initialTo: string;   // YYYY-MM
  minYM: string;       // 選択可能な最小YM (例: "2025-04")
  maxYM: string;       // 選択可能な最大YM (例: "2027-03")
  active: boolean;
  basePath?: string;
}

function* iterateYM(from: string, to: string) {
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    yield `${y}-${String(m).padStart(2, "0")}`;
    m++;
    if (m > 12) { m = 1; y++; }
  }
}

export default function CustomPeriodPicker({ business, initialFrom, initialTo, minYM, maxYM, active, basePath = "/" }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const options = Array.from(iterateYM(minYM, maxYM));

  const apply = () => {
    const [a, b] = from <= to ? [from, to] : [to, from];
    router.push(`${basePath}?period=custom&from=${a}&to=${b}&business=${encodeURIComponent(business)}`);
  };

  const label = (ym: string) => {
    const [y, m] = ym.split("-");
    return `${y}年${parseInt(m, 10)}月`;
  };

  // 非アクティブ時はグレー基調でオフ感を出し、ホバーで青系にハッキリ切り替わる
  const containerCls = active
    ? "group flex items-center gap-1 px-2 py-1 rounded border bg-blue-50 border-[#458BC3]"
    : "group flex items-center gap-1 px-2 py-1 rounded border bg-slate-100 border-slate-200 hover:bg-blue-50 hover:border-[#458BC3] transition-colors";
  const labelCls = active
    ? "text-xs text-slate-700 font-medium"
    : "text-xs text-slate-400 group-hover:text-slate-700 group-hover:font-medium transition-colors";
  const selectCls = active
    ? "text-xs bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-800"
    : "text-xs bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-400 group-hover:bg-white group-hover:border-slate-300 group-hover:text-slate-800 transition-colors";
  const dashCls = active
    ? "text-xs text-slate-500"
    : "text-xs text-slate-300 group-hover:text-slate-500 transition-colors";
  const btnCls = active
    ? "text-xs px-2 py-0.5 rounded bg-[#458BC3] text-white hover:bg-[#3677ab]"
    : "text-xs px-2 py-0.5 rounded bg-slate-300 text-white group-hover:bg-[#458BC3] hover:bg-[#3677ab] transition-colors";

  return (
    <div className={containerCls}>
      <span className={labelCls}>期間指定{!active && <span className="group-hover:hidden">（未使用）</span>}:</span>
      <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls}>
        {options.map((ym) => (
          <option key={ym} value={ym}>{label(ym)}</option>
        ))}
      </select>
      <span className={dashCls}>〜</span>
      <select value={to} onChange={(e) => setTo(e.target.value)} className={selectCls}>
        {options.map((ym) => (
          <option key={ym} value={ym}>{label(ym)}</option>
        ))}
      </select>
      <button type="button" onClick={apply} className={btnCls}>適用</button>
    </div>
  );
}
