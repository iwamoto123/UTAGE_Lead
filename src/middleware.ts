import { NextRequest, NextResponse } from "next/server";

// 環境変数で ID/Pass を指定 (BASIC_AUTH_USER / BASIC_AUTH_PASS)。
// 未設定の場合は認証スキップ (ローカル開発用)。
const USER = process.env.BASIC_AUTH_USER;
const PASS = process.env.BASIC_AUTH_PASS;

export function middleware(req: NextRequest) {
  if (!USER || !PASS) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [u, p] = decoded.split(":");
      if (u === USER && p === PASS) return NextResponse.next();
    }
  }

  return new NextResponse("認証が必要です", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="UTAGE Lead Dashboard"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  // API ルートも含めて全パス保護
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
