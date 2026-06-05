import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { notion, DS } from "@/lib/notion";
import fs from "fs";
import path from "path";

interface DailyRec {
  account_id: string;
  scenario_id: string;
  date: string;
  count: number;
}

export async function POST() {
  try {
    // 1) ローカルJSONスナップショットを読む
    const jsonPath = path.join(process.cwd(), "scripts/utage-aggregated.json");
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ ok: false, error: "scripts/utage-aggregated.json が無い" }, { status: 404 });
    }
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const records: DailyRec[] = data.scenario_daily ?? [];

    // 2) 流入経路マスター → (account_id, scenario_id) → master_page_id
    const sourceMap = new Map<string, string>();
    let cursor: string | undefined = undefined;
    do {
      const res: any = await notion.dataSources.query({
        data_source_id: DS.utageSource, start_cursor: cursor, page_size: 100,
      });
      for (const p of res.results) {
        const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
        const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
        sourceMap.set(`${a}|${s}`, p.id);
      }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    // 3) 既存日次レコードを (date, account, scenario) → page_id でロード
    const existing = new Map<string, string>();
    cursor = undefined;
    do {
      const res: any = await notion.dataSources.query({
        data_source_id: DS.utageDailyLead, start_cursor: cursor, page_size: 100,
      });
      for (const p of res.results) {
        const d = p.properties["日付"]?.date?.start ?? "";
        const a = p.properties["UTAGEアカウントID"]?.rich_text?.[0]?.plain_text ?? "";
        const s = p.properties["UTAGEシナリオID"]?.rich_text?.[0]?.plain_text ?? "";
        existing.set(`${d}|${a}|${s}`, p.id);
      }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    // 4) upsert
    let created = 0, updated = 0, skipped = 0;
    for (const r of records) {
      let srcId = sourceMap.get(`${r.account_id}|${r.scenario_id}`);
      if (!srcId) srcId = sourceMap.get(`${r.account_id}|`);
      if (!srcId) { skipped++; continue; }

      const props: any = {
        "名前": { title: [{ text: { content: `${r.date} ${r.account_id}/${r.scenario_id || "(account)"}` } }] },
        "日付": { date: { start: r.date } },
        "流入経路": { relation: [{ id: srcId }] },
        "新規読者数": { number: r.count },
        "UTAGEアカウントID": { rich_text: [{ text: { content: r.account_id } }] },
        "UTAGEシナリオID": { rich_text: [{ text: { content: r.scenario_id || "" } }] },
      };

      const key = `${r.date}|${r.account_id}|${r.scenario_id}`;
      if (existing.has(key)) {
        await notion.pages.update({ page_id: existing.get(key)!, properties: props });
        updated++;
      } else {
        await notion.pages.create({ parent: { data_source_id: DS.utageDailyLead }, properties: props });
        created++;
      }
    }

    // 5) キャッシュ無効化
    revalidateTag("utage-daily-leads", { expire: 0 });

    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      stats: { processed: records.length, created, updated, skipped },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
