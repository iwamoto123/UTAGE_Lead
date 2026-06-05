import { unstable_cache, revalidateTag } from "next/cache";
import { notion, DS, idToBusiness, idToYear } from "./notion";
import type { MonthlyPL, PLSummary } from "./types";

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? "600", 10);

function num(prop: any): number {
  if (prop?.type === "number") return prop.number ?? 0;
  if (prop?.type === "formula" && prop.formula?.type === "number") return prop.formula.number ?? 0;
  return 0;
}

function text(prop: any): string {
  if (prop?.type === "title") return prop.title?.map((t: any) => t.plain_text).join("") ?? "";
  if (prop?.type === "rich_text") return prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  if (prop?.type === "formula" && prop.formula?.type === "string") return prop.formula.string ?? "";
  return "";
}

function dateStart(prop: any): string | null {
  if (prop?.type === "date") return prop.date?.start ?? null;
  return null;
}

function relationFirstId(prop: any): string | null {
  if (prop?.type === "relation" && prop.relation?.length > 0) return prop.relation[0].id;
  return null;
}

async function fetchAllMonthlyPL(): Promise<MonthlyPL[]> {
  const results: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: any = await notion.dataSources.query({
      data_source_id: DS.monthlyPL,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return results.map((page: any): MonthlyPL => {
    const p = page.properties;
    const monthStart = dateStart(p["対象月"]) ?? "";
    const yearMonth = monthStart ? monthStart.slice(0, 7) : "";
    const bizYearId = relationFirstId(p["事業-年度"]);
    return {
      id: page.id,
      title: text(p["月"]),
      monthStart,
      yearMonth,
      business: bizYearId ? idToBusiness(bizYearId) : "その他",
      year: bizYearId ? idToYear(bizYearId) : null,
      uriage: num(p["売上"]),
      kyozaiUriage: num(p["教材売上"]),
      tankiUriage: num(p["短期講座売上"]),
      sonotaUriage: num(p["その他売上"]),
      kyozaiGenka: num(p["教材原価"]),
      jinkenhiBaito: num(p["人件費（バイト代）"]),
      shainKyuyo: num(p["社員給与"]),
      gyoumuItaku: num(p["業務委託費"]),
      kokokuhi: num(p["広告費"]),
      kokokuhiCard: num(p["広告費（カード明細）"]),
      jidaiKachin: num(p["地代家賃"]),
      suidoKonetsu: num(p["水道光熱費"]),
      tsushin: num(p["通信費"]),
      saas: num(p["SaaS利用料"]),
      gaichu: num(p["外注費"]),
      shiharaiTesuryo: num(p["支払手数料"]),
      riasu: num(p["リース料"]),
      genka: num(p["減価償却費"]),
      sonotaKeihi: num(p["その他経費"]),
      hojinIdo: num(p["法人間移動"]),
      kariireHensai: num(p["借入返済"]),
      seitoSu: num(p["生徒数"]),
      kou1Ninzu: num(p["高1人数"]),
      kou2Ninzu: num(p["高2人数"]),
      kou3Ninzu: num(p["高3人数"]),
      datalessExempt: p["データなし免除"]?.checkbox === true,
    };
  });
}

export const getMonthlyPL = unstable_cache(fetchAllMonthlyPL, ["monthly-pl"], {
  revalidate: CACHE_TTL,
  tags: ["monthly-pl"],
});

export function refreshPL() {
  revalidateTag("monthly-pl", { expire: 0 });
  revalidateTag("funnel-data", { expire: 0 });
  revalidateTag("utage-daily-leads", { expire: 0 });
}

export function summarize(records: MonthlyPL[]): PLSummary {
  let uriageGokei = 0;
  let kyozaiGenkaSum = 0;
  let hankanhiGokei = 0;
  for (const r of records) {
    uriageGokei += r.uriage + r.kyozaiUriage + r.tankiUriage + r.sonotaUriage;
    kyozaiGenkaSum += r.kyozaiGenka;
    hankanhiGokei +=
      r.jinkenhiBaito + r.shainKyuyo + r.gyoumuItaku +
      r.kokokuhi + r.jidaiKachin + r.suidoKonetsu + r.tsushin +
      r.saas + r.gaichu + r.shiharaiTesuryo + r.riasu + r.genka + r.sonotaKeihi;
  }
  const uriageSogensoeki = uriageGokei - kyozaiGenkaSum;
  const eigyouRiekishori = uriageSogensoeki;
  const eigyouRieki = uriageSogensoeki - hankanhiGokei;
  const eigyouRiekiRitsu = uriageGokei > 0 ? eigyouRieki / uriageGokei : 0;

  // 直近月の生徒数 = 同じ月の全事業合計（最新月ベース）
  const byMonth = new Map<string, number>();
  for (const r of records) {
    if (!r.yearMonth || r.seitoSu === 0) continue;
    byMonth.set(r.yearMonth, (byMonth.get(r.yearMonth) ?? 0) + r.seitoSu);
  }
  const latestMonth = Array.from(byMonth.keys()).sort().pop() ?? null;
  const seitoSuLatest = latestMonth ? (byMonth.get(latestMonth) ?? 0) : 0;

  // ARPU: 月別 売上÷生徒数 の平均
  const arpuByMonth: number[] = [];
  const monthlyRevenue = new Map<string, number>();
  for (const r of records) {
    if (!r.yearMonth) continue;
    const rev = r.uriage + r.kyozaiUriage + r.tankiUriage + r.sonotaUriage;
    monthlyRevenue.set(r.yearMonth, (monthlyRevenue.get(r.yearMonth) ?? 0) + rev);
  }
  for (const [ym, totalStudents] of byMonth) {
    if (totalStudents > 0) {
      const rev = monthlyRevenue.get(ym) ?? 0;
      arpuByMonth.push(rev / totalStudents);
    }
  }
  const arpu = arpuByMonth.length > 0 ? arpuByMonth.reduce((a, b) => a + b, 0) / arpuByMonth.length : 0;

  return { uriageGokei, uriageSogensoeki, hankanhiGokei, eigyouRiekishori, eigyouRieki, eigyouRiekiRitsu, seitoSuLatest, arpu };
}

const REVENUE_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"]; // blue, green, amber, purple
const COST_PALETTE = [
  "#ef4444", // red - 人件費（バイト代）
  "#f97316", // orange - 社員給与
  "#f59e0b", // amber - 業務委託費
  "#3b82f6", // blue - 広告費
  "#8b5cf6", // violet - 地代家賃
  "#ec4899", // pink - 水道光熱費
  "#06b6d4", // cyan - 通信費
  "#14b8a6", // teal - SaaS利用料
  "#a855f7", // purple - 外注費
  "#84cc16", // lime - 支払手数料
  "#eab308", // yellow - リース料
  "#64748b", // slate - 減価償却費
  "#94a3b8", // light slate - その他経費
];

export interface Breakdown {
  label: string;
  value: number;
  color: string;
}

export function summarizeRevenue(records: MonthlyPL[]): Breakdown[] {
  let monthly = 0, kyozai = 0, tanki = 0, sonota = 0;
  for (const r of records) {
    monthly += r.uriage;
    kyozai += r.kyozaiUriage;
    tanki += r.tankiUriage;
    sonota += r.sonotaUriage;
  }
  return [
    { label: "月謝売上", value: monthly, color: REVENUE_PALETTE[0] },
    { label: "教材売上", value: kyozai, color: REVENUE_PALETTE[1] },
    { label: "短期講座売上", value: tanki, color: REVENUE_PALETTE[2] },
    { label: "その他売上(YouTube等)", value: sonota, color: REVENUE_PALETTE[3] },
  ];
}

const BUSINESS_PALETTE: Record<string, string> = {
  "白谷塾オンライン教室": "#3b82f6", // blue
  "ローカルメディ": "#10b981",       // green
  "現地の宮﨑教室": "#f59e0b",       // amber
};

export function summarizeRevenueByBusiness(records: MonthlyPL[]): Breakdown[] {
  const totals: Record<string, number> = {
    "白谷塾オンライン教室": 0,
    "ローカルメディ": 0,
    "現地の宮﨑教室": 0,
  };
  for (const r of records) {
    const rev = r.uriage + r.kyozaiUriage + r.tankiUriage + r.sonotaUriage;
    if (r.business === "白谷塾オンライン") totals["白谷塾オンライン教室"] += rev;
    else if (r.business === "ローカルメディ") totals["ローカルメディ"] += rev;
    else if (r.business === "宮崎教室") totals["現地の宮﨑教室"] += rev;
  }
  return Object.entries(totals).map(([label, value]) => ({
    label,
    value,
    color: BUSINESS_PALETTE[label],
  }));
}

export function summarizeCost(records: MonthlyPL[]): Breakdown[] {
  let baito = 0, shain = 0, gyoumu = 0;
  let kokoku = 0, kachin = 0, suido = 0, tsushin = 0;
  let saas = 0, gaichu = 0, tesuryo = 0, riasu = 0, genka = 0, sonota = 0;
  for (const r of records) {
    baito += r.jinkenhiBaito;
    shain += r.shainKyuyo;
    gyoumu += r.gyoumuItaku;
    kokoku += r.kokokuhi;
    kachin += r.jidaiKachin;
    suido += r.suidoKonetsu;
    tsushin += r.tsushin;
    saas += r.saas;
    gaichu += r.gaichu;
    tesuryo += r.shiharaiTesuryo;
    riasu += r.riasu;
    genka += r.genka;
    sonota += r.sonotaKeihi;
  }
  return [
    { label: "人件費（バイト代）", value: baito, color: COST_PALETTE[0] },
    { label: "社員給与", value: shain, color: COST_PALETTE[1] },
    { label: "業務委託費", value: gyoumu, color: COST_PALETTE[2] },
    { label: "広告費", value: kokoku, color: COST_PALETTE[3] },
    { label: "地代家賃", value: kachin, color: COST_PALETTE[4] },
    { label: "水道光熱費", value: suido, color: COST_PALETTE[5] },
    { label: "通信費", value: tsushin, color: COST_PALETTE[6] },
    { label: "SaaS利用料", value: saas, color: COST_PALETTE[7] },
    { label: "外注費", value: gaichu, color: COST_PALETTE[8] },
    { label: "支払手数料", value: tesuryo, color: COST_PALETTE[9] },
    { label: "リース料", value: riasu, color: COST_PALETTE[10] },
    { label: "減価償却費", value: genka, color: COST_PALETTE[11] },
    { label: "その他経費", value: sonota, color: COST_PALETTE[12] },
  ];
}
