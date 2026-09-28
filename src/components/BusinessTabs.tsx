"use client";

import Link from "next/link";
import PendingDot from "@/components/PendingDot";

const BUSINESSES = [
  { key: "all", label: "全事業合計", color: "border-slate-700" },
  { key: "宮崎教室", label: "宮崎教室", color: "border-pink-500" },
  { key: "白谷塾オンライン", label: "白谷塾オンライン", color: "border-[#458BC3]" },
  { key: "ローカルメディ", label: "ローカルメディ", color: "border-green-500" },
  { key: "教材売上", label: "教材売上", color: "border-amber-500" },
];

export default function BusinessTabs({
  active,
  period,
  from,
  to,
  basePath = "/",
  kyozaiOff = false,
}: {
  active: string;
  period: string;
  from?: string;
  to?: string;
  basePath?: string;
  kyozaiOff?: boolean;
}) {
  const extra =
    (period === "custom" && from && to ? `&from=${from}&to=${to}` : "") +
    (kyozaiOff ? "&kyozai=off" : "");
  return (
    <div className="flex gap-1 flex-wrap border-b border-slate-200">
      {BUSINESSES.map((b) => {
        const isActive = active === b.key;
        const href = `${basePath}?business=${encodeURIComponent(b.key)}&period=${period}${extra}`;
        return (
          <Link
            key={b.key}
            href={href}
            prefetch={false}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              isActive
                ? `${b.color} text-slate-900 font-bold`
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {b.label}
            <PendingDot />
          </Link>
        );
      })}
    </div>
  );
}
