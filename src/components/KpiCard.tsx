import { manen, pct, yen } from "@/lib/format";

interface Props {
  label: string;
  value: number;
  type?: "yen" | "percent" | "count" | "yen_per_person";
  color?: "blue" | "orange" | "green" | "purple" | "red" | "slate";
  caption?: string;
}

const colorMap: Record<string, string> = {
  blue: "border-blue-500 bg-blue-50",
  orange: "border-orange-500 bg-orange-50",
  green: "border-green-500 bg-green-50",
  purple: "border-purple-500 bg-purple-50",
  red: "border-red-500 bg-red-50",
  slate: "border-slate-500 bg-slate-50",
};

function fmt(value: number, type: NonNullable<Props["type"]>): string {
  if (type === "percent") return pct(value);
  if (type === "count") return `${Math.round(value).toLocaleString("ja-JP")}人`;
  if (type === "yen_per_person") return `${yen(Math.round(value))}/人`;
  return manen(value);
}

export default function KpiCard({ label, value, type = "yen", color = "blue", caption }: Props) {
  const formatted = fmt(value, type);
  return (
    <div className={`rounded border-l-4 ${colorMap[color]} p-4 bg-white shadow-sm`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${value < 0 ? "text-red-600" : "text-slate-900"}`}>
        {formatted}
      </div>
      {caption && <div className="text-xs text-slate-400 mt-1">{caption}</div>}
    </div>
  );
}
