"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdPeriodKey = "last7days" | "last30days" | "last90days" | "thisFY" | "all" | "custom";
export type Granularity = "day" | "week" | "month";

const PERIODS: { key: AdPeriodKey; label: string }[] = [
  { key: "last7days", label: "直近7日" },
  { key: "last30days", label: "直近30日" },
  { key: "last90days", label: "直近90日" },
  { key: "thisFY", label: "今年度" },
  { key: "all", label: "全期間" },
];

const GRAINS: { key: Granularity; label: string }[] = [
  { key: "day", label: "日" },
  { key: "week", label: "週" },
  { key: "month", label: "月" },
];

export default function AdPeriodControls({
  active, grain, from, to, minDate, maxDate,
}: {
  active: AdPeriodKey; grain: Granularity;
  from: string; to: string; minDate: string; maxDate: string;
}) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const goPreset = (period: AdPeriodKey) => router.push(`/ads?period=${period}&grain=${grain}`);
  const goGrain = (g: Granularity) =>
    router.push(
      active === "custom"
        ? `/ads?period=custom&from=${from}&to=${to}&grain=${g}`
        : `/ads?period=${active}&grain=${g}`,
    );
  const applyCustom = () => {
    const [a, b] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    router.push(`/ads?period=custom&from=${a}&to=${b}&grain=${grain}`);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-1 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => goPreset(p.key)}
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

      <div className="flex items-center gap-1">
        <span className="text-[11px] text-slate-500">推移の単位</span>
        <div className="flex rounded border border-slate-300 overflow-hidden">
          {GRAINS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => goGrain(g.key)}
              className={`px-2.5 py-1 text-xs ${
                grain === g.key ? "bg-[#458BC3] text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
