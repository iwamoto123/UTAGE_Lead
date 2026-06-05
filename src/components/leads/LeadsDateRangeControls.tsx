"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type LeadsPeriodKey = "last7days" | "last14days" | "last30days" | "custom";

interface Props {
  active: LeadsPeriodKey;
  business: string;
  from: string;
  to: string;
  minDate: string;
  maxDate: string;
}

const PERIODS: { key: LeadsPeriodKey; label: string }[] = [
  { key: "last7days", label: "直近7日" },
  { key: "last14days", label: "直近14日" },
  { key: "last30days", label: "直近30日" },
];

export default function LeadsDateRangeControls({ active, business, from, to, minDate, maxDate }: Props) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const goPreset = (period: LeadsPeriodKey) => {
    router.push(`/leads?period=${period}&business=${encodeURIComponent(business)}`);
  };

  const applyCustom = () => {
    const [a, b] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    router.push(`/leads?period=custom&from=${a}&to=${b}&business=${encodeURIComponent(business)}`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1 flex-wrap">
        {PERIODS.map((p) => {
          const isActive = active === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => goPreset(p.key)}
              className={`px-3 py-1.5 text-sm rounded border ${
                isActive
                  ? "bg-[#458BC3] text-white border-[#458BC3]"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className={`group flex items-center gap-1 px-2 py-1 rounded border ${
        active === "custom" ? "bg-blue-50 border-[#458BC3]" : "bg-slate-100 border-slate-200 hover:bg-blue-50 hover:border-[#458BC3]"
      }`}>
        <span className={`text-xs ${active === "custom" ? "text-slate-700 font-medium" : "text-slate-400 group-hover:text-slate-700"}`}>
          期間指定:
        </span>
        <input
          type="date"
          value={customFrom}
          min={minDate}
          max={maxDate}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="text-xs bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-800"
        />
        <span className="text-xs text-slate-500">〜</span>
        <input
          type="date"
          value={customTo}
          min={minDate}
          max={maxDate}
          onChange={(e) => setCustomTo(e.target.value)}
          className="text-xs bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-800"
        />
        <button type="button" onClick={applyCustom} className="text-xs px-2 py-0.5 rounded bg-[#458BC3] text-white hover:bg-[#3677ab]">
          適用
        </button>
      </div>
    </div>
  );
}
