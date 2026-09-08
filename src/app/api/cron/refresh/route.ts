import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { refreshPL } from "@/lib/db";
import { refreshContentKpi } from "@/lib/content-kpi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 毎日決まった時刻に Vercel Cron から叩かれる（1本目）。
 * ここは「キャッシュを捨てる」だけを行う。
 *
 * 取り直しを同じリクエストの中でやると、revalidateTag の無効化がまだ効いておらず
 * 古いキャッシュを読んでしまう。だから温め直しは別リクエスト（/api/cron/warm）に分けている。
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  refreshPL();
  refreshContentKpi();
  for (const tag of ["weekly-ad-reports", "campaign-master", "source-campaign-entries", "campaign-name-entries", "meta-daily"]) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({ ok: true, invalidated: true, ts: new Date().toISOString() });
}
