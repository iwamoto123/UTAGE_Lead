"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdPeriodKey = "last30days" | "last90days" | "thisFY" | "all" | "custom";

const PERIODS: { key: AdPeriodKey; label: string }[] = [
  { key: "last30days", label: "直近30日" },
  { key: "last90days", label: "直近90日" },
  { key: "thisFY", label: "今年度" },
  { key: "all", label: "全期間" },
];

export default function AdPeriodControls({
  active, from, to, minDate, maxDate,
}: {
  active: AdPeriodKey; from: string; to: string; minDate: string; maxDate: string;
}) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const applyCustom = () => {
    const [a, b] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    router.push(`/ads?period=custom&from=${a}&to=${b}`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => router.push(`/ads?period=${p.key}`)}
            className={`px-3 py-1.5 text-sm rounded border ${
              active === p.key
                ? "bg-[#458BC3] text-white border-[#458BC3]"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded border ${
        active === "custom" ? "bg-blue-50 border-[#458BC3]" : "bg-slate-100 border-slate-200"
      }`}>
        <input type="date" value={customFrom} min={minDate} max={maxDate}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="text-xs bg-white border border-slate-300 rounded px-1.5 py-1" />
        <span className="text-xs text-slate-500">〜</span>
        <input type="date" value={customTo} min={minDate} max={maxDate}
          onChange={(e) => setCustomTo(e.target.value)}
          className="text-xs bg-white border border-slate-300 rounded px-1.5 py-1" />
        <button type="button" onClick={applyCustom}
          className="text-xs px-2 py-1 rounded bg-[#458BC3] text-white">適用</button>
      </div>
    </div>
  );
}
