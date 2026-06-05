import { NextRequest, NextResponse } from "next/server";
import { markDataless } from "@/lib/write";
import { refreshPL } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { yearMonth, business, exempt } = body;
    if (!yearMonth || !business) {
      return NextResponse.json({ error: "yearMonth and business are required" }, { status: 400 });
    }
    if (business !== "宮崎教室" && business !== "白谷塾オンライン" && business !== "ローカルメディ") {
      return NextResponse.json({ error: "invalid business" }, { status: 400 });
    }
    const result = await markDataless(yearMonth, business, exempt === true);
    refreshPL();
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "unknown error" }, { status: 500 });
  }
}
