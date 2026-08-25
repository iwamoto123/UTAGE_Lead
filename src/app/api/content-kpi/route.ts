import { NextRequest, NextResponse } from "next/server";
import { upsertYoutubeKpi, upsertLineKpi, archiveKpi } from "@/lib/content-kpi-write";
import { refreshContentKpi } from "@/lib/content-kpi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { kind, row } = body ?? {};
    if (kind !== "youtube" && kind !== "line") {
      return NextResponse.json({ error: "kind must be 'youtube' or 'line'" }, { status: 400 });
    }
    if (!row || typeof row !== "object") {
      return NextResponse.json({ error: "row is required" }, { status: 400 });
    }
    const id = kind === "youtube" ? await upsertYoutubeKpi(row) : await upsertLineKpi(row);
    refreshContentKpi();
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await archiveKpi(id);
    refreshContentKpi();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
