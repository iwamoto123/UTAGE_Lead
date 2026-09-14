"use client";

import Link from "next/link";

const STAGES = ["all", "体験中", "塾生", "検討中"] as const;
const BUSINESSES = ["all", "白谷塾オンライン", "ローカルメディ", "宮崎教室"] as const;

const LABEL: Record<string, string> = { all: "すべて" };

function Group({
  items,
  current,
  param,
  other,
}: {
  items: readonly string[];
  current: string;
  param: "stage" | "business";
  other: Record<string, string>;
}) {
  return (
    <div className="flex gap-1 rounded bg-slate-100 p-1">
      {items.map((v) => {
        const qs = new URLSearchParams({ ...other, [param]: v });
        const active = current === v;
        return (
          <Link
            key={v}
            href={`/students?${qs.toString()}`}
            className={[
              "rounded px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              active ? "bg-[#458BC3] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-[#458BC3]",
            ].join(" ")}
          >
            {LABEL[v] ?? v}
          </Link>
        );
      })}
    </div>
  );
}

export default function StudentFilters({ stage, business }: { stage: string; business: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Group items={STAGES} current={stage} param="stage" other={{ business }} />
      <Group items={BUSINESSES} current={business} param="business" other={{ stage }} />
    </div>
  );
}
