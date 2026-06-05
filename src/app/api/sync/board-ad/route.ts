import { NextRequest, NextResponse } from "next/server";
import { getBoardBreakdown, getUnclassifiedCampaigns, clearBoardCache } from "@/lib/board";
import { updateMonthlyPL } from "@/lib/write";
import { refreshPL } from "@/lib/db";

type Business = "宮崎教室" | "白谷塾オンライン" | "ローカルメディ";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apply = body.apply === true;

    // 毎回キャッシュをクリア（ユーザーがNotionでラベル付け直したら即反映するため）
    clearBoardCache();

    const breakdown = await getBoardBreakdown();
    const unclassified = await getUnclassifiedCampaigns();

    interface PreviewRow {
      yearMonth: string;
      business: Business;
      amount: number;
    }
    const preview: PreviewRow[] = [];

    const sortedMonths = Array.from(breakdown.keys()).sort();
    for (const ym of sortedMonths) {
      const bizMap = breakdown.get(ym)!;
      for (const [biz, amt] of bizMap.entries()) {
        if (amt <= 0) continue;
        if (biz !== "宮崎教室" && biz !== "白谷塾オンライン" && biz !== "ローカルメディ") continue;
        preview.push({ yearMonth: ym, business: biz as Business, amount: amt });
      }
    }

    if (!apply) {
      return NextResponse.json({
        success: true,
        applied: false,
        count: preview.length,
        preview,
        unclassified,
      });
    }

    const results: { yearMonth: string; business: Business; amount: number; pageUrl: string }[] = [];
    for (const p of preview) {
      const r = await updateMonthlyPL(p.yearMonth, p.business, { "広告費": p.amount });
      results.push({
        yearMonth: p.yearMonth,
        business: p.business,
        amount: p.amount,
        pageUrl: r.pageUrl,
      });
    }
    refreshPL();
    return NextResponse.json({
      success: true,
      applied: true,
      count: results.length,
      results,
      unclassified,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "unknown error" }, { status: 500 });
  }
}
