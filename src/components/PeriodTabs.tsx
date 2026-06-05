import Link from "next/link";
import type { PeriodKey } from "@/lib/filter";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "current_month", label: "今月" },
  { key: "last_month", label: "前月" },
  { key: "current_year", label: "今年度(R8)" },
  { key: "last_year", label: "前年度(R7)" },
  { key: "all", label: "全期間" },
];

export default function PeriodTabs({ active, business, basePath = "/" }: { active: PeriodKey; business: string; basePath?: string }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {PERIODS.map((p) => {
        const isActive = active === p.key;
        const href = `${basePath}?period=${p.key}&business=${encodeURIComponent(business)}`;
        return (
          <Link
            key={p.key}
            href={href}
            className={`px-3 py-1.5 text-sm rounded border ${
              isActive
                ? "bg-[#458BC3] text-white border-[#458BC3]"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
