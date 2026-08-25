import { unstable_cache, revalidateTag } from "next/cache";
import { notion } from "./notion";

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? "600", 10);

export const CONTENT_DS = {
  youtube: process.env.NOTION_DS_YOUTUBE_KPI ?? "4456ac78-5543-43a9-8078-a74f61705bed",
  lineBroadcast: process.env.NOTION_DS_LINE_KPI ?? "38e4dd0a-d0a8-4513-aaf2-7f980f00a4b5",
};

export const YT_CHANNELS = [
  "白谷塾チャンネル",
  "たけちゃん先生",
  "英検コース",
  "共通テスト「物理」",
  "共通テスト「国語」",
  "共通テスト「情報」",
  "医学科再受験",
  "ローカルメディ",
] as const;

export const LINE_ACCOUNTS = [
  "白谷塾オンライン教室【R8公式】",
  "英検逆転コース",
  "地方医学部オンライン塾 ローカルメディ",
  "【再受験コース】ローカルメディ",
  "編入コース",
  "メタ広告LINE",
] as const;

export const LINE_GENRES = [
  "受験生向け",
  "英検コース",
  "医学科志望生向け",
  "再受験コース",
  "編入コース",
  "保護者向け",
] as const;

export const LINE_WRITERS = ["酒井", "末安", "岩本＋末安"] as const;

export interface YoutubeKpi {
  id: string;
  title: string;
  url: string | null;
  channel: string | null;
  publishedAt: string | null;
  daysSincePublish: number | null;
  giveaway: string;
  lineAdds: number | null;
  views: number | null;
  thumbCtr: number | null;
  retention: number | null;
  cvr: number | null;
  measuredAt: string | null;
  routeKey: string;
}

export interface LineKpi {
  id: string;
  title: string;
  account: string | null;
  genre: string | null;
  sentAt: string | null;
  sentCount: number | null;
  openRate: number | null;
  clickRate: number | null;
  writer: string | null;
  measuredAt: string | null;
}

/* ── Notion プロパティの読み取り ── */
function text(p: any): string {
  if (p?.type === "title") return p.title?.map((t: any) => t.plain_text).join("") ?? "";
  if (p?.type === "rich_text") return p.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  return "";
}
function num(p: any): number | null {
  if (p?.type === "number") return p.number ?? null;
  if (p?.type === "formula" && p.formula?.type === "number") return p.formula.number ?? null;
  return null;
}
function sel(p: any): string | null {
  return p?.type === "select" ? (p.select?.name ?? null) : null;
}
function dateStart(p: any): string | null {
  return p?.type === "date" ? (p.date?.start ?? null) : null;
}
function urlOf(p: any): string | null {
  return p?.type === "url" ? (p.url ?? null) : null;
}

function daysBetween(from: string | null): number | null {
  if (!from) return null;
  const d = new Date(from + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / 86_400_000);
}

/** DBがインテグレーションに未共有でも画面を落とさない */
export class ContentKpiAccessError extends Error {}

async function queryAll(dataSourceId: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  try {
    do {
      const res: any = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: cursor,
        page_size: 100,
      });
      out.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  } catch (e: any) {
    if (String(e?.message ?? "").includes("Could not find data_source")) {
      throw new ContentKpiAccessError(dataSourceId);
    }
    throw e;
  }
  return out;
}

/** 2つのKPI DBがインテグレーションから見えるか。見えなければ未共有の名前を返す */
async function _checkContentKpiAccess(): Promise<string[]> {
  const missing: string[] = [];
  for (const [name, id] of [["YouTube KPI", CONTENT_DS.youtube], ["LINE配信 KPI", CONTENT_DS.lineBroadcast]] as const) {
    try {
      await notion.dataSources.query({ data_source_id: id, page_size: 1 });
    } catch {
      missing.push(name);
    }
  }
  return missing;
}

/* ── 取得 ── */
async function fetchYoutube(): Promise<YoutubeKpi[]> {
  let pages: any[];
  try {
    pages = await queryAll(CONTENT_DS.youtube);
  } catch (e) {
    if (e instanceof ContentKpiAccessError) return [];
    throw e;
  }
  return pages
    .map((pg: any) => {
      const p = pg.properties;
      const publishedAt = dateStart(p["公開日"]);
      return {
        id: pg.id,
        title: text(p["動画タイトル"]),
        url: urlOf(p["リンク"]),
        channel: sel(p["チャンネル"]),
        publishedAt,
        daysSincePublish: daysBetween(publishedAt),
        giveaway: text(p["追加プレゼントの内容"]),
        lineAdds: num(p["LINE追加数"]),
        views: num(p["再生数"]),
        thumbCtr: num(p["サムネクリック率"]),
        retention: num(p["視聴者維持率"]),
        cvr: num(p["CVR"]),
        measuredAt: dateStart(p["計測日"]),
        routeKey: text(p["経路キー"]),
      } satisfies YoutubeKpi;
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

async function fetchLine(): Promise<LineKpi[]> {
  let pages: any[];
  try {
    pages = await queryAll(CONTENT_DS.lineBroadcast);
  } catch (e) {
    if (e instanceof ContentKpiAccessError) return [];
    throw e;
  }
  return pages
    .map((pg: any) => {
      const p = pg.properties;
      return {
        id: pg.id,
        title: text(p["配信内容"]),
        account: sel(p["公式LINEアカウント"]),
        genre: sel(p["ジャンル"]),
        sentAt: dateStart(p["配信日"]),
        sentCount: num(p["配信数"]),
        openRate: num(p["開封率"]),
        clickRate: num(p["クリック率"]),
        writer: sel(p["原稿担当"]),
        measuredAt: dateStart(p["計測日"]),
      } satisfies LineKpi;
    })
    .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""));
}

/** 共有設定の確認は毎回叩くと2往復ぶん遅くなるためキャッシュする */
export const checkContentKpiAccess = unstable_cache(
  _checkContentKpiAccess, ["content-kpi-access"], { revalidate: CACHE_TTL, tags: ["content-kpi"] });

export const getYoutubeKpi = unstable_cache(fetchYoutube, ["content-kpi-youtube"], {
  revalidate: CACHE_TTL,
  tags: ["content-kpi"],
});
export const getLineKpi = unstable_cache(fetchLine, ["content-kpi-line"], {
  revalidate: CACHE_TTL,
  tags: ["content-kpi"],
});
export function refreshContentKpi() {
  revalidateTag("content-kpi", { expire: 0 });
}
