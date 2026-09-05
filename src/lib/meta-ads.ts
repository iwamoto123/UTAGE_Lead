import { unstable_cache } from "next/cache";
import { notion, DS } from "./notion";

/** Meta広告 日次実績（広告セット×日）。meta-ads-sync が毎朝Meta APIから書き込む */
const META_DAILY_DS = process.env.NOTION_DS_META_DAILY ?? "3cf88258-2d8c-816c-a8ff-000bb14e6e04";
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? "600", 10);

export interface MetaDailyRow {
  date: string;                 // YYYY-MM-DD
  campaignName: string;         // Meta側のキャンペーン名
  adsetName: string;            // Meta側の広告セット名
  campaignPageId: string | null; // Notionキャンペーンマスターのページid
  spend: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
}

function textOf(prop: any): string {
  if (!prop) return "";
  if (prop.type === "title") return prop.title?.map((t: any) => t.plain_text).join("") ?? "";
  if (prop.type === "rich_text") return prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  return "";
}

async function _fetchMetaDaily(): Promise<MetaDailyRow[]> {
  const rows: MetaDailyRow[] = [];
  let cursor: string | undefined = undefined;
  try {
    do {
      const res: any = await notion.dataSources.query({
        data_source_id: META_DAILY_DS,
        start_cursor: cursor,
        page_size: 100,
      });
      for (const p of res.results) {
        const props = p.properties;
        const date = props["日付"]?.date?.start ?? null;
        if (!date) continue;
        rows.push({
          date: date.slice(0, 10),
          campaignName: textOf(props["Metaキャンペーン名"]),
          adsetName: textOf(props["Meta広告セット名"]),
          campaignPageId: props["キャンペーン"]?.relation?.[0]?.id ?? null,
          spend: props["消化金額"]?.number ?? 0,
          impressions: props["インプレッション"]?.number ?? 0,
          clicks: props["クリック数"]?.number ?? 0,
          linkClicks: props["リンククリック数"]?.number ?? 0,
        });
      }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  } catch (e: any) {
    if (e?.code === "object_not_found") {
      console.warn("[meta-ads] 日次実績DBに Integration 未接続");
      return [];
    }
    throw e;
  }
  return rows;
}

export const getMetaDaily = unstable_cache(_fetchMetaDaily, ["meta-daily"], {
  revalidate: CACHE_TTL,
  tags: ["meta-daily"],
});

// ─── 集計 ─────────────────────────────

export interface AdTotals {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;      // クリック ÷ 表示回数
  cpc: number | null;      // 消化 ÷ クリック
  cpm: number | null;      // 表示1000回あたりの消化
}

export function sumRows(rows: MetaDailyRow[]): AdTotals {
  let spend = 0, impressions = 0, clicks = 0;
  for (const r of rows) {
    spend += r.spend;
    impressions += r.impressions;
    clicks += r.clicks;
  }
  return {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : null,
    cpc: clicks > 0 ? spend / clicks : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
  };
}

export function filterByRange(rows: MetaDailyRow[], from: string, to: string): MetaDailyRow[] {
  return rows.filter((r) => r.date >= from && r.date <= to);
}

export type Granularity = "day" | "week" | "month";

/** 週の区切りは meta-ads-sync の集計と揃えて水曜はじまり（水〜火） */
const WEEK_ANCHOR = 3; // JSの getUTCDay: Sun=0 … Wed=3

function weekStart(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  const shift = (d.getUTCDay() - WEEK_ANCHOR + 7) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

export interface PeriodBucket {
  key: string;      // 並べ替え用
  label: string;    // 画面表示用
  totals: AdTotals;
}

/** 日／週／月ごとの集計。古い順 */
export function byPeriod(rows: MetaDailyRow[], g: Granularity): PeriodBucket[] {
  const map = new Map<string, MetaDailyRow[]>();
  for (const r of rows) {
    const key = g === "month" ? r.date.slice(0, 7) : g === "week" ? weekStart(r.date) : r.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, rs]) => ({
      key,
      label: g === "month" ? key : g === "week" ? `${md(key)}〜${md(addDays(key, 6))}` : key,
      totals: sumRows(rs),
    }));
}

/** 期間の長さから粒度を決める。日次の表が何百行にもならないようにするため */
export function defaultGranularity(from: string, to: string): Granularity {
  const days = Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000,
  ) + 1;
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

export interface CampaignRollup {
  campaignPageId: string | null;
  /** Notionのキャンペーン名。未対応ならMeta側のキャンペーン名 */
  label: string;
  mapped: boolean;
  totals: AdTotals;
  firstDate: string;
  lastDate: string;
  adsets: { name: string; totals: AdTotals }[];
  lineRegistrations: number | null;
  conversions: number | null;
}

/** キャンペーン別に畳む。LINE登録・成約は週次広告レポート側から渡す */
export function byCampaign(
  rows: MetaDailyRow[],
  campaignNames: Map<string, string>,
  lineByCampaign: Map<string, number>,
  convByCampaign: Map<string, number>,
): CampaignRollup[] {
  const map = new Map<string, MetaDailyRow[]>();
  for (const r of rows) {
    // 未対応の広告セットはMetaのキャンペーン名でまとめる（消えると気づけないため）
    const key = r.campaignPageId ?? `__unmapped__${r.campaignName}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const out: CampaignRollup[] = [];
  for (const [key, rs] of map) {
    const mapped = !key.startsWith("__unmapped__");
    const pageId = mapped ? key : null;
    const adsetMap = new Map<string, MetaDailyRow[]>();
    for (const r of rs) {
      const n = r.adsetName || r.campaignName;
      if (!adsetMap.has(n)) adsetMap.set(n, []);
      adsetMap.get(n)!.push(r);
    }
    const dates = rs.map((r) => r.date).sort();
    out.push({
      campaignPageId: pageId,
      label: mapped ? (campaignNames.get(key) ?? "(不明なキャンペーン)") : rs[0].campaignName,
      mapped,
      totals: sumRows(rs),
      firstDate: dates[0],
      lastDate: dates[dates.length - 1],
      adsets: [...adsetMap.entries()]
        .map(([name, ars]) => ({ name, totals: sumRows(ars) }))
        .sort((a, b) => b.totals.spend - a.totals.spend),
      lineRegistrations: pageId ? (lineByCampaign.get(pageId) ?? 0) : null,
      conversions: pageId ? (convByCampaign.get(pageId) ?? 0) : null,
    });
  }
  return out.sort((a, b) => b.totals.spend - a.totals.spend);
}

export function cpa(spend: number, count: number | null): number | null {
  return count && count > 0 ? spend / count : null;
}
