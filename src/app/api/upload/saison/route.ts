import { NextRequest, NextResponse } from "next/server";
import { parseSaison } from "@/lib/parsers/saison";
import { allocateByBoard } from "@/lib/board";
import { updateCardAd, checkExisting } from "@/lib/write";
import { refreshPL } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const apply = formData.get("apply") === "true";

    if (!file) {
      return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });
    }
    if (!file.name.toLowerCase().includes("saison")) {
      return NextResponse.json({ error: "SAISON_YYMM.csv 形式のファイルを選択してください" }, { status: 400 });
    }

    const fileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = parseSaison(buffer);

    type AllocationRow = {
      yearMonth: string;
      business: "宮崎教室" | "白谷塾オンライン" | "ローカルメディ";
      amount: number;
      alreadyApplied: boolean;
    };

    type PreviewItem = {
      yearMonth: string;
      total: number;
      breakdown: { miyazaki: number; online: number; localmedi: number };
      details: { date: string; shop: string; amount: number }[];
      allocations: AllocationRow[];
    };

    const months = [...parsed.adTotalByMonth.keys()].sort();
    const preview: PreviewItem[] = [];

    for (const ym of months) {
      const total = parsed.adTotalByMonth.get(ym) ?? 0;
      const breakdown = await allocateByBoard(ym, total);
      const details = parsed.adRowsByMonth.get(ym) ?? [];

      const allocations: AllocationRow[] = [];
      for (const [biz, amt] of [
        ["宮崎教室", breakdown.miyazaki] as const,
        ["白谷塾オンライン", breakdown.online] as const,
        ["ローカルメディ", breakdown.localmedi] as const,
      ]) {
        if (amt > 0) {
          const check = await checkExisting(ym, biz, fileName);
          allocations.push({
            yearMonth: ym,
            business: biz,
            amount: amt,
            alreadyApplied: check.alreadyApplied,
          });
        }
      }

      preview.push({
        yearMonth: ym,
        total,
        breakdown,
        details: details.map((d) => ({ date: d.date, shop: d.shop, amount: d.amount })),
        allocations,
      });
    }

    if (!apply) {
      return NextResponse.json({
        success: true,
        applied: false,
        fileName,
        payDate: parsed.payDate,
        cardTotal: parsed.totalAmount,
        preview,
      });
    }

    // Notion更新を実行（重複はスキップ）
    const results: { yearMonth: string; business: string; amount: number; pageUrl: string; skipped: boolean; reason?: string }[] = [];
    for (const p of preview) {
      for (const a of p.allocations) {
        if (a.alreadyApplied) {
          results.push({
            yearMonth: a.yearMonth,
            business: a.business,
            amount: a.amount,
            pageUrl: "",
            skipped: true,
            reason: "ファイル名が既に登録履歴に存在",
          });
          continue;
        }
        const r = await updateCardAd(a.yearMonth, a.business, a.amount, fileName);
        results.push({
          yearMonth: r.yearMonth,
          business: r.business,
          amount: r.amount,
          pageUrl: r.pageUrl,
          skipped: r.skipped,
          reason: r.reason,
        });
      }
    }
    refreshPL();
    return NextResponse.json({
      success: true,
      applied: true,
      fileName,
      count: results.filter((r) => !r.skipped).length,
      skippedCount: results.filter((r) => r.skipped).length,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "unknown error" }, { status: 500 });
  }
}
