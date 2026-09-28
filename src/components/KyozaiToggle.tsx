import Link from "next/link";

/* 教材売上をこの事業の売上に含めるかどうか。
   UTAGEで売れた教材は白谷塾オンラインの売上だが、月謝とは性格が違うので外して見たいことがある。 */
export default function KyozaiToggle({
  include, business, period, from, to,
}: { include: boolean; business: string; period: string; from?: string; to?: string }) {
  const extra = period === "custom" && from && to ? `&from=${from}&to=${to}` : "";
  const href = `/?business=${encodeURIComponent(business)}&period=${period}${extra}${include ? "&kyozai=off" : ""}`;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 select-none"
    >
      <span
        className={`w-4 h-4 border rounded-sm flex items-center justify-center text-[11px] leading-none ${
          include ? "bg-[#458BC3] border-[#458BC3] text-white" : "bg-white border-slate-400 text-transparent"
        }`}
      >
        ✓
      </span>
      教材売上を含める
    </Link>
  );
}
