import { Suspense } from "react";
import { getPeriodRange, type PeriodKey } from "@/lib/filter";
import PeriodTabs from "@/components/PeriodTabs";
import CustomPeriodPicker from "@/components/CustomPeriodPicker";
import BusinessTabs from "@/components/BusinessTabs";
import KyozaiToggle from "@/components/KyozaiToggle";
import PLContent from "@/components/PLContent";
import { SkeletonPage } from "@/components/ui/Skeleton";

type SP = Promise<{ period?: string; business?: string; from?: string; to?: string; kyozai?: string }>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const period = (sp.period as PeriodKey) ?? "current_year";
  const businessParam = (sp.business ?? "all") as
    "all" | "宮崎教室" | "白谷塾オンライン" | "ローカルメディ" | "教材売上";
  // 教材売上は事業ではなくUTAGEの売上区分。PLの集計は白谷塾オンラインとして扱う
  const isKyozaiTab = businessParam === "教材売上";
  const business = (isKyozaiTab ? "白谷塾オンライン" : businessParam) as
    "all" | "宮崎教室" | "白谷塾オンライン" | "ローカルメディ";
  const includeKyozai = sp.kyozai !== "off";
  // 期間の計算はNotionを読まないので、タブと一緒に先に描ける
  const range = getPeriodRange(period, new Date(), sp.from, sp.to);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <BusinessTabs active={businessParam} period={period} from={range.fromYM} to={range.toYM} kyozaiOff={!includeKyozai} />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <PeriodTabs active={period} business={businessParam} kyozaiOff={!includeKyozai} />
            <CustomPeriodPicker
              business={businessParam}
              initialFrom={period === "custom" ? range.fromYM : "2025-04"}
              initialTo={period === "custom" ? range.toYM : "2027-03"}
              minYM="2025-04"
              maxYM="2027-03"
              active={period === "custom"}
            />
          </div>
          <div className="flex items-center gap-4">
            {!isKyozaiTab && (business === "白谷塾オンライン" || business === "all") && (
              <KyozaiToggle
                include={includeKyozai}
                business={businessParam}
                period={period}
                from={range.fromYM}
                to={range.toYM}
              />
            )}
            <div className="text-sm text-slate-600">{range.label}</div>
          </div>
        </div>
      </div>

      {/* タブを押すとここだけが差し替わる。keyを変えて毎回フォールバックを出す */}
      <Suspense
        key={`${businessParam}|${period}|${range.fromYM}|${range.toYM}|${includeKyozai}`}
        fallback={<SkeletonPage title="月次PL" cards={4} rows={12} />}
      >
        <PLContent
          period={period}
          isKyozaiTab={isKyozaiTab}
          business={business}
          includeKyozai={includeKyozai}
          from={sp.from}
          to={sp.to}
        />
      </Suspense>
    </div>
  );
}
