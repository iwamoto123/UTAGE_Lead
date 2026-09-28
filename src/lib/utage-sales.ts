import { unstable_cache } from "next/cache";
import { notion, idToBusiness } from "./notion";

/* UTAGEで決済された売上（教材・短期プログラム）。
   月謝と違って請求書を起こさないため、毎朝 utage-sales-sync がこのDBへ入れている。
   月次PLの「教材売上」「短期講座売上」は同じ数字の月合計なので、
   ここは内訳（どの企画が・何件・誰が）を出すために読む。 */

export const SALES_DS = process.env.NOTION_DS_UTAGE_SALES ?? "9143ba82-08ce-415b-ad42-631266bda988";

export type SalesKubun = "短期プログラム・企画" | "教材" | "その他";

export interface DailySale {
  date: string;        // YYYY-MM-DD
  yearMonth: string;   // YYYY-MM
  name: string;        // 企画名・商品名
  kubun: SalesKubun;
  amount: number;
  count: number;
  buyers: string[];
  business: string;
}

export interface SalesGroup {
  name: string;
  kubun: SalesKubun;
  amount: number;
  count: number;
  buyers: string[];
  firstDate: string;
  lastDate: string;
}

/* Notionのプロパティは型がプロパティごとに違うので、必要な形だけを取り出す */
type RichText = { plain_text?: string };
type Prop = {
  type?: string;
  title?: RichText[];
  rich_text?: RichText[];
  number?: number | null;
  select?: { name?: string } | null;
  date?: { start?: string } | null;
  relation?: { id: string }[];
};

function text(p?: Prop): string {
  if (p?.type === "title") return p.title?.map((t) => t.plain_text ?? "").join("") ?? "";
  if (p?.type === "rich_text") return p.rich_text?.map((t) => t.plain_text ?? "").join("") ?? "";
  return "";
}
function num(p?: Prop): number {
  return p?.type === "number" ? (p.number ?? 0) : 0;
}
function sel(p?: Prop): string {
  return p?.type === "select" ? (p.select?.name ?? "") : "";
}
function dateStart(p?: Prop): string | null {
  return p?.type === "date" ? (p.date?.start ?? null) : null;
}
function firstRelation(p?: Prop): string | null {
  return p?.type === "relation" && p.relation?.length ? p.relation[0].id : null;
}

async function fetchDailySales(): Promise<DailySale[]> {
  const out: DailySale[] = [];
  let cursor: string | undefined;
  try {
    do {
      const res = await notion.dataSources.query({
        data_source_id: SALES_DS,
        start_cursor: cursor,
        page_size: 100,
      });
      for (const pg of res.results) {
        const p = (pg as { properties: Record<string, Prop> }).properties;
        const date = dateStart(p["日付"]);
        if (!date) continue;
        const bizId = firstRelation(p["事業-年度"]);
        const buyers = text(p["購入者"]).split("・").map((s) => s.trim()).filter(Boolean);
        out.push({
          date,
          yearMonth: date.slice(0, 7),
          // 表示名はファネルごとに付けているので、タイトルから日付を落として使う
          name: text(p["名前"]).replace(/^\d{4}-\d{2}-\d{2}\s*/, ""),
          kubun: (sel(p["区分"]) || "その他") as SalesKubun,
          amount: num(p["売上"]),
          count: num(p["件数"]),
          buyers,
          business: bizId ? idToBusiness(bizId) : "その他",
        });
      }
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);
  } catch {
    return [];   // DBが未共有でも画面は落とさない
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export const getUtageSales = unstable_cache(fetchDailySales, ["utage-sales"], {
  revalidate: parseInt(process.env.CACHE_TTL_SECONDS ?? "600", 10),
  tags: ["utage-sales"],
});

/** 期間と事業で絞る。fromYM/toYM は YYYY-MM（両端を含む） */
export function filterSales(
  rows: DailySale[],
  fromYM: string,
  toYM: string,
  business?: string,
): DailySale[] {
  return rows.filter(
    (r) =>
      r.yearMonth >= fromYM &&
      r.yearMonth <= toYM &&
      (!business || business === "all" || r.business === business),
  );
}

/** 企画・商品ごとにまとめる。購入者は重複を落として並べる */
export function groupSales(rows: DailySale[], kubun?: SalesKubun): SalesGroup[] {
  const map = new Map<string, SalesGroup>();
  for (const r of rows) {
    if (kubun && r.kubun !== kubun) continue;
    const g = map.get(r.name) ?? {
      name: r.name, kubun: r.kubun, amount: 0, count: 0,
      buyers: [], firstDate: r.date, lastDate: r.date,
    };
    g.amount += r.amount;
    g.count += r.count;
    for (const b of r.buyers) if (!g.buyers.includes(b)) g.buyers.push(b);
    if (r.date < g.firstDate) g.firstDate = r.date;
    if (r.date > g.lastDate) g.lastDate = r.date;
    map.set(r.name, g);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function totalOf(rows: DailySale[], kubun?: SalesKubun) {
  let amount = 0, count = 0;
  for (const r of rows) {
    if (kubun && r.kubun !== kubun) continue;
    amount += r.amount;
    count += r.count;
  }
  return { amount, count };
}

/** 月×商品の表。教材が月にそれぞれ何冊売れたかを出す */
export function byMonthAndName(rows: DailySale[]): {
  months: string[];
  names: string[];
  cell: (ym: string, name: string) => { amount: number; count: number } | undefined;
  monthTotal: (ym: string) => { amount: number; count: number };
  nameTotal: (name: string) => { amount: number; count: number };
} {
  const grid = new Map<string, { amount: number; count: number }>();
  const months = new Set<string>();
  const names = new Set<string>();
  for (const r of rows) {
    months.add(r.yearMonth);
    names.add(r.name);
    const key = `${r.yearMonth}|${r.name}`;
    const cur = grid.get(key) ?? { amount: 0, count: 0 };
    cur.amount += r.amount;
    cur.count += r.count;
    grid.set(key, cur);
  }
  const sum = (pred: (k: string) => boolean) => {
    let amount = 0, count = 0;
    for (const [k, v] of grid) if (pred(k)) { amount += v.amount; count += v.count; }
    return { amount, count };
  };
  return {
    months: [...months].sort(),
    // 売れた金額が大きい商品から左に並べる
    names: [...names].sort((a, b) => sum((k) => k.endsWith(`|${b}`)).amount - sum((k) => k.endsWith(`|${a}`)).amount),
    cell: (ym, name) => grid.get(`${ym}|${name}`),
    monthTotal: (ym) => sum((k) => k.startsWith(`${ym}|`)),
    nameTotal: (name) => sum((k) => k.endsWith(`|${name}`)),
  };
}

/** 月ごとの合計。グラフと月別表に使う */
export function byMonth(rows: DailySale[], kubun?: SalesKubun): Map<string, { amount: number; count: number }> {
  const m = new Map<string, { amount: number; count: number }>();
  for (const r of rows) {
    if (kubun && r.kubun !== kubun) continue;
    const cur = m.get(r.yearMonth) ?? { amount: 0, count: 0 };
    cur.amount += r.amount;
    cur.count += r.count;
    m.set(r.yearMonth, cur);
  }
  return m;
}
