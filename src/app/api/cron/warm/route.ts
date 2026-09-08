import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGES = ["/", "/leads", "/ads", "/content", "/weekly-ad", "/instructors", "/status"];

/**
 * 毎日決まった時刻に Vercel Cron から叩かれる（2本目・/api/cron/refresh の3分後）。
 * 各ページを実際に描画させてキャッシュに載せる。
 *
 * 2巡するのは、unstable_cache の書き込みがリクエストの完了時に確定するため。
 * 1巡目は Notion / UTAGE を素で叩いて10秒近くかかり、2巡目でそれが全部キャッシュに乗る。
 * ここで踏んでおけば、最初に開いた人が待たされない。
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const origin = req.nextUrl.origin;
  const headers: Record<string, string> = {};
  const u = process.env.BASIC_AUTH_USER, pw = process.env.BASIC_AUTH_PASS;
  if (u && pw) headers.authorization = `Basic ${Buffer.from(`${u}:${pw}`).toString("base64")}`;

  const hit = async (path: string, round: number) => {
    const t = Date.now();
    try {
      // クエリを変えて、描画済みの出力ではなく必ずページ本体を通す
      const r = await fetch(`${origin}${path}?_warm=${round}`, { headers, cache: "no-store" });
      if (!r.ok) return `HTTP ${r.status}`;
      // ページはストリーミングで返る。本文を最後まで読まないと描画が終わらないうちに戻ってしまう
      const body = await r.text();
      return `${Date.now() - t}ms / ${Math.round(body.length / 1024)}KB`;
    } catch (e: unknown) {
      return `error: ${(e as Error)?.message ?? "unknown"}`.slice(0, 80);
    }
  };

  const rounds: Record<string, string>[] = [];
  for (const round of [1, 2]) {
    const r: Record<string, string> = {};
    await Promise.all(PAGES.map(async (p) => { r[p] = await hit(p, round); }));
    rounds.push(r);
  }

  return NextResponse.json({
    ok: true,
    elapsedMs: Date.now() - started,
    // 2巡目が1巡目よりはっきり速ければ、キャッシュが乗っている
    round1: rounds[0],
    round2: rounds[1],
    ts: new Date().toISOString(),
  });
}
