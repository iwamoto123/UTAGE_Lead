import { NextResponse } from "next/server";
import { refreshPL } from "@/lib/db";

export async function POST() {
  refreshPL();
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
