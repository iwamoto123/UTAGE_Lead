import { notion } from "./notion";
import { CONTENT_DS } from "./content-kpi";

/** 数値プロパティ。null/undefined はクリア扱い */
function numProp(v: unknown) {
  if (v === null || v === undefined || v === "") return { number: null };
  const n = typeof v === "number" ? v : Number(v);
  return { number: Number.isFinite(n) ? n : null };
}
function textProp(v: unknown) {
  const s = typeof v === "string" ? v : "";
  return { rich_text: s ? [{ type: "text" as const, text: { content: s.slice(0, 2000) } }] : [] };
}
function titleProp(v: unknown) {
  const s = typeof v === "string" && v.trim() ? v : "(無題)";
  return { title: [{ type: "text" as const, text: { content: s.slice(0, 2000) } }] };
}
function selProp(v: unknown) {
  return v ? { select: { name: String(v) } } : { select: null };
}
function dateProp(v: unknown) {
  return v ? { date: { start: String(v) } } : { date: null };
}
function urlProp(v: unknown) {
  return v ? { url: String(v) } : { url: null };
}

export interface YoutubeKpiInput {
  id?: string;
  title?: string;
  url?: string | null;
  channel?: string | null;
  publishedAt?: string | null;
  giveaway?: string;
  lineAdds?: number | null;
  views?: number | null;
  thumbCtr?: number | null;
  retention?: number | null;
  measuredAt?: string | null;
  routeKey?: string;
}

export interface LineKpiInput {
  id?: string;
  title?: string;
  account?: string | null;
  genre?: string | null;
  sentAt?: string | null;
  sentCount?: number | null;
  openRate?: number | null;
  clickRate?: number | null;
  writer?: string | null;
  measuredAt?: string | null;
}

function youtubeProps(v: YoutubeKpiInput): Record<string, any> {
  const p: Record<string, any> = {};
  if (v.title !== undefined) p["動画タイトル"] = titleProp(v.title);
  if (v.url !== undefined) p["リンク"] = urlProp(v.url);
  if (v.channel !== undefined) p["チャンネル"] = selProp(v.channel);
  if (v.publishedAt !== undefined) p["公開日"] = dateProp(v.publishedAt);
  if (v.giveaway !== undefined) p["追加プレゼントの内容"] = textProp(v.giveaway);
  if (v.lineAdds !== undefined) p["LINE追加数"] = numProp(v.lineAdds);
  if (v.views !== undefined) p["再生数"] = numProp(v.views);
  if (v.thumbCtr !== undefined) p["サムネクリック率"] = numProp(v.thumbCtr);
  if (v.retention !== undefined) p["視聴者維持率"] = numProp(v.retention);
  if (v.measuredAt !== undefined) p["計測日"] = dateProp(v.measuredAt);
  if (v.routeKey !== undefined) p["経路キー"] = textProp(v.routeKey);
  return p;
}

function lineProps(v: LineKpiInput): Record<string, any> {
  const p: Record<string, any> = {};
  if (v.title !== undefined) p["配信内容"] = titleProp(v.title);
  if (v.account !== undefined) p["公式LINEアカウント"] = selProp(v.account);
  if (v.genre !== undefined) p["ジャンル"] = selProp(v.genre);
  if (v.sentAt !== undefined) p["配信日"] = dateProp(v.sentAt);
  if (v.sentCount !== undefined) p["配信数"] = numProp(v.sentCount);
  if (v.openRate !== undefined) p["開封率"] = numProp(v.openRate);
  if (v.clickRate !== undefined) p["クリック率"] = numProp(v.clickRate);
  if (v.writer !== undefined) p["原稿担当"] = selProp(v.writer);
  if (v.measuredAt !== undefined) p["計測日"] = dateProp(v.measuredAt);
  return p;
}

export async function upsertYoutubeKpi(v: YoutubeKpiInput): Promise<string> {
  const properties = youtubeProps(v);
  if (v.id) {
    await notion.pages.update({ page_id: v.id, properties });
    return v.id;
  }
  if (!properties["動画タイトル"]) properties["動画タイトル"] = titleProp(v.title);
  const res: any = await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: CONTENT_DS.youtube },
    properties,
  });
  return res.id;
}

export async function upsertLineKpi(v: LineKpiInput): Promise<string> {
  const properties = lineProps(v);
  if (v.id) {
    await notion.pages.update({ page_id: v.id, properties });
    return v.id;
  }
  if (!properties["配信内容"]) properties["配信内容"] = titleProp(v.title);
  const res: any = await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: CONTENT_DS.lineBroadcast },
    properties,
  });
  return res.id;
}

export async function archiveKpi(id: string): Promise<void> {
  await notion.pages.update({ page_id: id, archived: true });
}
