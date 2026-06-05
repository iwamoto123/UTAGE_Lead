import { unstable_cache } from "next/cache";
import { notion, idToBusiness, DS } from "./notion";

const CONSULTATION_DS = "e4ce1fb3-9c34-44e7-ae0b-79f917ba2acb"; // R8面談・体験生徒
const STUDENT_DS = "72ee6524-b6fa-4426-a2f2-1e909d0dd7b0"; // 受講生
const WEEKLY_AD_DS = "f7788828-c0d8-4d5b-8cc0-2394ba947cd6"; // 週次広告レポート

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? "600", 10);

export type FunnelStage = "lead" | "consultation" | "trial" | "enrollment";

export interface FunnelRecord {
  yearMonth: string;
  business: string;
  stage: FunnelStage;
  count: number;
  // 流入企画（オプション）
  campaignName?: string;
}

interface ConsultationRow {
  id: string;
  name: string;
  meetingMonth: string | null;  // YYYY-MM（最終面談日）
  business: string;             // 事業-年度から導出
  status: string;
  resultIsTrial: boolean;       // 体験まで進んだか
  campaignName: string;
}

interface StudentRow {
  id: string;
  name: string;
  enrollmentMonth: string | null; // YYYY-MM（入塾月）
  business: string;
  status: string;
}

interface AdRow {
  yearMonth: string;       // 期間startの月（YYYY-MM）
  business: string;        // キャンペーンから判定（簡易）
  leadCount: number;       // LINE登録者数
  campaignName: string;
}

async function queryAll(dataSourceId: string): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | undefined = undefined;
  try {
    do {
      const res: any = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: cursor,
        page_size: 100,
      });
      results.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  } catch (e: any) {
    if (e?.code === "object_not_found") {
      console.warn(`[marketing] DB ${dataSourceId} に Integration 接続未追加`);
      return [];
    }
    throw e;
  }
  return results;
}

// キャンペーン名 → 事業 マップを取得（キャンペーンマスター経由）
async function fetchCampaignBusinessMap(): Promise<Map<string, { name: string; business: string }>> {
  const pages = await queryAll("8e8bab1e-37de-4739-a814-b5108901523c");
  const map = new Map<string, { name: string; business: string }>();
  for (const p of pages) {
    const props = p.properties;
    const name = props["キャンペーン名"]?.title?.map((t: any) => t.plain_text).join("") ?? "";
    const bizYearRel = props["事業-年度"]?.relation ?? [];
    const business = bizYearRel.length > 0 ? idToBusiness(bizYearRel[0].id) : "その他";
    map.set(p.id, { name, business });
  }
  return map;
}

async function fetchConsultations(): Promise<ConsultationRow[]> {
  const pages = await queryAll(CONSULTATION_DS);
  const campaignMap = await fetchCampaignBusinessMap();
  return pages.map((p): ConsultationRow => {
    const props = p.properties;
    const name = props["名前"]?.title?.map((t: any) => t.plain_text).join("") ?? "";
    const date = props["最終面談日"]?.date?.start ?? null;
    const bizYearRel = props["事業-年度"]?.relation ?? [];
    const business = bizYearRel.length > 0 ? idToBusiness(bizYearRel[0].id) : "その他";
    const status = props["ステータス"]?.select?.name ?? "";
    const result = props["結果"]?.select?.name ?? "";
    const campaignRel = props["流入企画"]?.relation ?? [];
    const campaignName = campaignRel.length > 0
      ? (campaignMap.get(campaignRel[0].id)?.name ?? "")
      : "";
    const trialStatuses = ["体験中", "塾生", "元塾生"];
    const trialResults = ["体験後入塾", "体験後お断り", "他の塾も体験後に最終決定"];
    const resultIsTrial = trialStatuses.includes(status) || trialResults.includes(result);
    return {
      id: p.id,
      name,
      meetingMonth: date ? date.slice(0, 7) : null,
      business,
      status,
      resultIsTrial,
      campaignName,
    };
  });
}

async function fetchStudents(): Promise<StudentRow[]> {
  const pages = await queryAll(STUDENT_DS);
  return pages.map((p): StudentRow => {
    const props = p.properties;
    const name = props["名前"]?.title?.map((t: any) => t.plain_text).join("") ?? "";
    const enrollmentDate = props["入塾月"]?.date?.start ?? null;
    const bizYearRel = props["事業-年度"]?.relation ?? [];
    const business = bizYearRel.length > 0 ? idToBusiness(bizYearRel[0].id) : "その他";
    const status = props["ステータス"]?.select?.name ?? "";
    return {
      id: p.id,
      name,
      enrollmentMonth: enrollmentDate ? enrollmentDate.slice(0, 7) : null,
      business,
      status,
    };
  });
}

async function fetchAdLeads(): Promise<AdRow[]> {
  const pages = await queryAll(WEEKLY_AD_DS);
  const campaignMap = await fetchCampaignBusinessMap();
  return pages.map((p): AdRow => {
    const props = p.properties;
    const startDate = props["期間"]?.date?.start ?? null;
    const leadCount = props["LINE登録者数"]?.number ?? 0;
    const campaignRel = props["キャンペーン"]?.relation ?? [];
    let campaignName = "";
    let business = "白谷塾オンライン"; // フォールバック
    if (campaignRel.length > 0) {
      const c = campaignMap.get(campaignRel[0].id);
      if (c) {
        campaignName = c.name;
        if (c.business !== "その他") business = c.business;
      }
    }
    return {
      yearMonth: startDate ? startDate.slice(0, 7) : "",
      business,
      leadCount,
      campaignName,
    };
  });
}

async function _fetchAllFunnelData() {
  const [consultations, students, ads] = await Promise.all([
    fetchConsultations(),
    fetchStudents(),
    fetchAdLeads(),
  ]);
  return { consultations, students, ads };
}

export const getFunnelData = unstable_cache(_fetchAllFunnelData, ["funnel-data"], {
  revalidate: CACHE_TTL,
  tags: ["funnel-data"],
});

// ─── UTAGE 日次リード数 DBの読み込み ─────────────────────────────

export type UtageRouteCategory =
  | "メタ広告" | "メタ広告(合流)" | "YouTube自然流入" | "SNS自然流入" | "HP/ブログ"
  | "面談予約" | "公式LINE" | "教材販売" | "集計外";

export interface UtageDailyLead {
  date: string;       // YYYY-MM-DD
  yearMonth: string;  // YYYY-MM
  category: UtageRouteCategory | "未分類";
  business: string | null;
  accountId: string;
  scenarioId: string;
  accountName: string;
  scenarioName: string;
  count: number;
}

// 流入経路マスター 1行に対する campaign 紐付け
export interface SourceCampaignLink {
  accountId: string;
  scenarioId: string;
  campaignIds: string[];
}

async function _fetchSourceMasterRows(): Promise<any[]> {
  const rows: any[] = [];
  let cursor: string | undefined = undefined;
  try {
    do {
      const res: any = await notion.dataSources.query({
        data_source_id: DS.utageSource,
        start_cursor: cursor,
        page_size: 100,
      });
      rows.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  } catch (e: any) {
    if (e?.code === "object_not_found") {
      console.warn("[marketing] UTAGE流入経路マスターに Integration 接続未追加");
      return [];
    }
    throw e;
  }
  return rows;
}

// account|scenario → 紐付け企画 page_id[]（unstable_cache のシリアライズ対応で配列で返す）
async function _fetchSourceCampaignEntries(): Promise<[string, string[]][]> {
  const rows = await _fetchSourceMasterRows();
  const entries: [string, string[]][] = [];
  for (const p of rows) {
    const accId = textOf(p.properties["UTAGEアカウントID"]);
    const sceId = textOf(p.properties["UTAGEシナリオID"]);
    const rel = p.properties["紐付け企画"]?.relation ?? [];
    if (rel.length === 0) continue;
    entries.push([`${accId}|${sceId}`, rel.map((r: any) => r.id)]);
  }
  return entries;
}

export const getSourceCampaignEntries = unstable_cache(_fetchSourceCampaignEntries, ["source-campaign-entries"], {
  revalidate: CACHE_TTL,
  tags: ["source-campaign-entries", "utage-daily-leads"],
});

// 企画DB: page_id → 企画名（配列で返す）
async function _fetchCampaignNameEntries(): Promise<[string, string][]> {
  const entries: [string, string][] = [];
  let cursor: string | undefined = undefined;
  try {
    do {
      const res: any = await notion.dataSources.query({
        data_source_id: DS.campaign,
        start_cursor: cursor,
        page_size: 100,
      });
      for (const p of res.results) {
        const name = p.properties["企画名"]?.title?.map((t: any) => t.plain_text).join("")
          ?? p.properties["名前"]?.title?.map((t: any) => t.plain_text).join("")
          ?? "";
        if (name) entries.push([p.id, name]);
      }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  } catch (e: any) {
    if (e?.code === "object_not_found") {
      console.warn("[marketing] 企画DB に Integration 接続未追加");
      return entries;
    }
    throw e;
  }
  return entries;
}

export const getCampaignNameEntries = unstable_cache(_fetchCampaignNameEntries, ["campaign-name-entries"], {
  revalidate: CACHE_TTL,
  tags: ["campaign-name-entries"],
});

async function _fetchUtageDailyLeads(): Promise<UtageDailyLead[]> {
  // 流入経路マスター: account/scenario → category + 事業
  const sourceRows = await _fetchSourceMasterRows();
  if (sourceRows.length === 0) return [];

  // マスターのキー: (account_id, scenario_id or "")
  const sourceMap = new Map<string, { category: UtageRouteCategory; business: string | null; accountName: string; scenarioName: string }>();
  for (const p of sourceRows) {
    const accId = textOf(p.properties["UTAGEアカウントID"]);
    const sceId = textOf(p.properties["UTAGEシナリオID"]);
    const accountName = textOf(p.properties["UTAGEアカウント名"]);
    const scenarioName = textOf(p.properties["UTAGEシナリオ名"]);
    const category = p.properties["経路カテゴリ"]?.select?.name as UtageRouteCategory | undefined;
    if (!category) continue;
    const bizRel = p.properties["事業-年度"]?.relation?.[0]?.id;
    const business = bizRel ? idToBusiness(bizRel) : null;
    sourceMap.set(`${accId}|${sceId}`, { category, business, accountName, scenarioName });
  }

  // 日次リード数 DBから全件取得
  const leadRows: any[] = [];
  let cursor: string | undefined = undefined;
  try {
    do {
      const res: any = await notion.dataSources.query({
        data_source_id: DS.utageDailyLead,
        start_cursor: cursor,
        page_size: 100,
      });
      leadRows.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  } catch (e: any) {
    if (e?.code === "object_not_found") {
      console.warn("[marketing] UTAGE日次リード数に Integration 接続未追加");
      return [];
    }
    throw e;
  }

  return leadRows.map((p: any): UtageDailyLead => {
    const date = p.properties["日付"]?.date?.start ?? "";
    const accId = textOf(p.properties["UTAGEアカウントID"]);
    const sceId = textOf(p.properties["UTAGEシナリオID"]);
    const count = p.properties["新規読者数"]?.number ?? 0;
    const src = sourceMap.get(`${accId}|${sceId}`) ?? sourceMap.get(`${accId}|`);
    return {
      date,
      yearMonth: date.slice(0, 7),
      category: src?.category ?? "未分類",
      business: src?.business ?? null,
      accountId: accId,
      scenarioId: sceId,
      accountName: src?.accountName ?? "",
      scenarioName: src?.scenarioName ?? "",
      count,
    };
  });
}

export const getUtageDailyLeads = unstable_cache(_fetchUtageDailyLeads, ["utage-daily-leads"], {
  revalidate: CACHE_TTL,
  tags: ["utage-daily-leads"],
});

function textOf(prop: any): string {
  if (!prop) return "";
  if (prop.type === "rich_text") return prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  if (prop.type === "title") return prop.title?.map((t: any) => t.plain_text).join("") ?? "";
  return "";
}

export function summarizeUtageFunnel(
  leads: UtageDailyLead[],
  fromYM: string,
  toYM: string,
  businessFilter: "all" | string = "all",
): { metaAd: number; youtube: number; officialLine: number; meetingReservation: number } {
  const leadFromYM = fromYM < R8_FUNNEL_START_YM ? R8_FUNNEL_START_YM : fromYM;
  const matchBiz = (b: string | null) => {
    if (businessFilter === "all") return b === "白谷塾オンライン" || b === "ローカルメディ";
    return b === businessFilter;
  };
  const totals = { metaAd: 0, youtube: 0, officialLine: 0, meetingReservation: 0 };
  for (const l of leads) {
    if (l.yearMonth < leadFromYM || l.yearMonth > toYM) continue;
    if (!matchBiz(l.business)) continue;
    // メタ広告(合流) は重複なので合計には含めない
    if (l.category === "メタ広告") totals.metaAd += l.count;
    else if (l.category === "YouTube自然流入") totals.youtube += l.count;
    else if (l.category === "公式LINE") totals.officialLine += l.count;
    else if (l.category === "面談予約") totals.meetingReservation += l.count;
  }
  return totals;
}

export interface FunnelSummary {
  leadCount: number;
  consultationCount: number;
  trialCount: number;
  enrollmentCount: number;
}

export interface FunnelByMonth {
  yearMonth: string;
  byBusiness: Map<string, FunnelSummary>;
  total: FunnelSummary;
}

// R8として広告リード／面談記録を集計し始めた月（これより前は未整備のため対象外）
export const R8_FUNNEL_START_YM = "2026-01";

export function summarizeFunnel(
  data: { consultations: ConsultationRow[]; students: StudentRow[]; ads: AdRow[] },
  fromYM: string,
  toYM: string,
  businessFilter: "all" | string = "all",
): FunnelSummary {
  let leadCount = 0;
  let consultationCount = 0;
  let trialCount = 0;
  let enrollmentCount = 0;

  // リード／面談の有効レンジ: 期間×2026-01以降
  const leadFromYM = fromYM < R8_FUNNEL_START_YM ? R8_FUNNEL_START_YM : fromYM;
  const inLeadRange = (ym: string | null) =>
    ym !== null && ym >= leadFromYM && ym <= toYM;
  const inRange = (ym: string | null) =>
    ym !== null && ym >= fromYM && ym <= toYM;
  // 集計対象は「白谷塾オンライン」「ローカルメディ」のみ（宮崎は対象外）
  const matchBiz = (b: string) => {
    if (businessFilter === "all") return b === "白谷塾オンライン" || b === "ローカルメディ";
    return b === businessFilter;
  };

  for (const a of data.ads) {
    if (inLeadRange(a.yearMonth) && matchBiz(a.business)) leadCount += a.leadCount;
  }
  for (const c of data.consultations) {
    if (inLeadRange(c.meetingMonth) && matchBiz(c.business)) {
      consultationCount += 1;
      if (c.resultIsTrial) trialCount += 1;
    }
  }
  for (const s of data.students) {
    if (inRange(s.enrollmentMonth) && matchBiz(s.business)) enrollmentCount += 1;
  }

  return { leadCount, consultationCount, trialCount, enrollmentCount };
}

export interface CampaignFunnelRow {
  campaignName: string;
  business: string;
  leadCount: number;
  consultationCount: number;
  trialCount: number;
  enrollmentCount: number;
}

// ─── 統合ファネル集計（UTAGE + 面談・体験生徒 + 受講生 + 広告費） ───

export interface UnifiedScenarioRow {
  accountId: string;
  scenarioId: string;
  accountName: string;
  scenarioName: string;
  business: string;
  category: UtageRouteCategory | "未分類";
  leadCount: number;     // 期間内 リード数
  reservationCount: number; // 同アカウント内 面談予約シナリオの数
}

export interface UnifiedDailyPoint {
  date: string;
  metaAd: number;
  youtube: number;
  sns: number;
  hpBlog: number;
  officialLine: number;
  reservation: number;
}

export interface UnifiedSummary {
  totals: {
    metaAdLeads: number;
    metaAdMergedLeads: number; // メタ広告(合流) — 他アカウント由来の重複
    youtubeLeads: number;
    snsLeads: number;
    hpBlogLeads: number;
    officialLeads: number;
    totalLeads: number;        // 純リード(合流除外)
    totalLeadsIncMerged: number; // 合流含む
    reservations: number;     // UTAGE 面談予約シナリオ
    consultations: number;    // R8面談・体験生徒DB（実施済み面談）
    trials: number;           // 面談のうち体験段階まで進んだ人
    enrollments: number;      // 受講生DB（入塾）
    adCost: number;           // 月次PL の広告費合計
  };
  daily: UnifiedDailyPoint[];
  byBusiness: Record<string, { leads: number; reservations: number; consultations: number; trials: number; enrollments: number; adCost: number }>;
  scenarios: UnifiedScenarioRow[];
}

export function summarizeUnified(
  utageLeads: UtageDailyLead[],
  funnel: { consultations: ConsultationRow[]; students: StudentRow[] },
  monthlyPL: { yearMonth: string; business: string; kokokuhi: number; kokokuhiCard: number }[],
  fromYM: string,
  toYM: string,
  businessFilter: "all" | string,
  categoryFilter: "all" | "メタ広告" | "YouTube自然流入" | "公式LINE",
): UnifiedSummary {
  const leadFromYM = fromYM < R8_FUNNEL_START_YM ? R8_FUNNEL_START_YM : fromYM;
  const matchBiz = (b: string | null) => {
    if (businessFilter === "all") return b === "白谷塾オンライン" || b === "ローカルメディ";
    return b === businessFilter;
  };
  const matchCat = (c: UtageRouteCategory | "未分類") => {
    if (categoryFilter === "all") {
      return c === "メタ広告" || c === "メタ広告(合流)" || c === "YouTube自然流入"
        || c === "SNS自然流入" || c === "HP/ブログ" || c === "公式LINE";
    }
    return c === categoryFilter;
  };

  const inLeadRange = (d: string) => {
    const ym = d.slice(0, 7);
    return ym >= leadFromYM && ym <= toYM;
  };
  const inFullRange = (ym: string | null) => ym !== null && ym >= fromYM && ym <= toYM;

  // 日次マップ
  const dailyMap = new Map<string, UnifiedDailyPoint>();
  const ensureDay = (d: string) => {
    if (!dailyMap.has(d)) dailyMap.set(d, { date: d, metaAd: 0, youtube: 0, sns: 0, hpBlog: 0, officialLine: 0, reservation: 0 });
    return dailyMap.get(d)!;
  };

  // シナリオ集計
  const sceMap = new Map<string, UnifiedScenarioRow>();
  // アカウント単位の面談予約集計（カテゴリ=面談予約 のシナリオ）
  const reservationByAccount = new Map<string, number>();

  let totalMeta = 0, totalMetaMerged = 0, totalYT = 0, totalSNS = 0, totalHP = 0, totalOfficial = 0, totalReservation = 0;
  const byBiz: Record<string, { leads: number; reservations: number; consultations: number; trials: number; enrollments: number; adCost: number }> = {};
  const bizKey = (b: string | null) => b ?? "未分類";
  const ensureBiz = (b: string | null) => {
    const k = bizKey(b);
    if (!byBiz[k]) byBiz[k] = { leads: 0, reservations: 0, consultations: 0, trials: 0, enrollments: 0, adCost: 0 };
    return byBiz[k];
  };

  for (const l of utageLeads) {
    if (!inLeadRange(l.date)) continue;
    if (!matchBiz(l.business)) continue;

    if (l.category === "面談予約") {
      // 面談予約は カテゴリフィルタ無視で集計（経路問わず）
      totalReservation += l.count;
      ensureBiz(l.business).reservations += l.count;
      ensureDay(l.date).reservation += l.count;
      reservationByAccount.set(l.accountId, (reservationByAccount.get(l.accountId) ?? 0) + l.count);
      continue;
    }

    if (!matchCat(l.category)) continue;

    const day = ensureDay(l.date);
    const biz = ensureBiz(l.business);
    if (l.category === "メタ広告") { totalMeta += l.count; biz.leads += l.count; day.metaAd += l.count; }
    else if (l.category === "メタ広告(合流)") { totalMetaMerged += l.count; /* 合流は biz.leads に含めない（純リードの二重計上回避） */ day.metaAd += l.count; }
    else if (l.category === "YouTube自然流入") { totalYT += l.count; biz.leads += l.count; day.youtube += l.count; }
    else if (l.category === "SNS自然流入") { totalSNS += l.count; biz.leads += l.count; day.sns += l.count; }
    else if (l.category === "HP/ブログ") { totalHP += l.count; biz.leads += l.count; day.hpBlog += l.count; }
    else if (l.category === "公式LINE") { totalOfficial += l.count; biz.leads += l.count; day.officialLine += l.count; }
    else continue;

    // シナリオ別集計（経路リードのみ。面談予約は別途）
    const key = `${l.accountId}|${l.scenarioId}`;
    if (!sceMap.has(key)) {
      sceMap.set(key, {
        accountId: l.accountId, scenarioId: l.scenarioId,
        accountName: l.accountName, scenarioName: l.scenarioName,
        business: l.business ?? "未分類", category: l.category,
        leadCount: 0, reservationCount: 0,
      });
    }
    sceMap.get(key)!.leadCount += l.count;
  }

  // 同アカウントの面談予約をシナリオ行に注入（同一アカウント内で按分: リード数比率）
  for (const accId of new Set([...sceMap.values()].map((s) => s.accountId))) {
    const reservations = reservationByAccount.get(accId) ?? 0;
    if (reservations === 0) continue;
    const accRows = [...sceMap.values()].filter((s) => s.accountId === accId);
    const accLeadTotal = accRows.reduce((s, r) => s + r.leadCount, 0);
    if (accLeadTotal === 0) continue;
    for (const r of accRows) {
      r.reservationCount = Math.round((r.leadCount / accLeadTotal) * reservations);
    }
  }

  // 面談実施・体験・入塾
  let consultations = 0, trials = 0, enrollments = 0;
  for (const c of funnel.consultations) {
    if (inFullRange(c.meetingMonth) && matchBiz(c.business)) {
      consultations += 1;
      ensureBiz(c.business).consultations += 1;
      if (c.resultIsTrial) {
        trials += 1;
        ensureBiz(c.business).trials += 1;
      }
    }
  }
  for (const s of funnel.students) {
    if (inFullRange(s.enrollmentMonth) && matchBiz(s.business)) {
      enrollments += 1;
      ensureBiz(s.business).enrollments += 1;
    }
  }

  // 広告費（月次PL）
  let adCost = 0;
  for (const r of monthlyPL) {
    if (!inFullRange(r.yearMonth)) continue;
    if (!matchBiz(r.business)) continue;
    // 広告費（手動）と 広告費（カード明細）のうち大きい方を採用（同じ値なら手動）
    const v = Math.max(r.kokokuhi, r.kokokuhiCard);
    adCost += v;
    ensureBiz(r.business).adCost += v;
  }

  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const scenarios = [...sceMap.values()].sort((a, b) => b.leadCount - a.leadCount);

  const totalPure = totalMeta + totalYT + totalSNS + totalHP + totalOfficial;
  return {
    totals: {
      metaAdLeads: totalMeta,
      metaAdMergedLeads: totalMetaMerged,
      youtubeLeads: totalYT,
      snsLeads: totalSNS,
      hpBlogLeads: totalHP,
      officialLeads: totalOfficial,
      totalLeads: totalPure,
      totalLeadsIncMerged: totalPure + totalMetaMerged,
      reservations: totalReservation,
      consultations,
      trials,
      enrollments,
      adCost,
    },
    daily,
    byBusiness: byBiz,
    scenarios,
  };
}

// ─── リード獲得詳細用の集計 ─────────────────────────────

export interface CampaignRef {
  pageId: string;
  name: string;  // 解決できなかった場合は "" のままにする
}

export interface AccountSummary {
  accountId: string;
  accountName: string;
  category: string;
  business: string;
  cumulativeTotal: number;       // UTAGE 全期間累計（reader_list_all の total）
  periodLeads: number;            // 期間内の純リード（メタ広告(合流)・面談予約を除外）
  periodReservations: number;     // 期間内 面談予約シナリオ
  campaigns: CampaignRef[];       // 紐付け企画（複数可）
}

export interface ScenarioSummary {
  accountId: string;
  scenarioId: string;
  accountName: string;
  scenarioName: string;
  category: string;
  business: string;
  periodTotal: number;
  dailyAverage: number;
  campaigns: CampaignRef[];
}

export interface DailySeriesPoint {
  date: string;
  value: number;
}

export interface LeadsPageData {
  accounts: AccountSummary[];
  scenarios: ScenarioSummary[];
  dailyByScenario: Map<string, DailySeriesPoint[]>; // scenarioKey -> 日付別
  dailyTotals: { date: string; metaAd: number; metaAdMerged: number; youtube: number; sns: number; hpBlog: number; officialLine: number; reservation: number }[];
  periodDays: number;
}

const R8_FUNNEL_START_DATE = `${R8_FUNNEL_START_YM}-01`;

export function summarizeLeadsPage(
  utageLeads: UtageDailyLead[],
  accountTotals: { id: string; name: string; category: string; business: string; total: number }[],
  fromDate: string,
  toDate: string,
  businessFilter: "all" | string,
  campaignMap: Map<string, string[]> = new Map(),  // account|scenario → page_id[]
  campaignNames: Map<string, string> = new Map(),  // page_id → 企画名
): LeadsPageData {
  const resolveCampaigns = (pageIds: string[]): CampaignRef[] =>
    pageIds.map((id) => ({ pageId: id, name: campaignNames.get(id) ?? "" }));
  // アカウント単位の企画集約: アカウント配下のシナリオに紐付く 企画 を重複排除して集める
  const campaignsByAccount = new Map<string, Set<string>>();
  for (const [key, ids] of campaignMap) {
    const accId = key.split("|")[0];
    if (!accId) continue;
    const set = campaignsByAccount.get(accId) ?? new Set<string>();
    for (const id of ids) set.add(id);
    campaignsByAccount.set(accId, set);
  }
  // /leads では呼び出し側が期間を決めるので内部クランプはしない
  const matchBiz = (b: string | null) => {
    if (businessFilter === "all") return b === "白谷塾オンライン" || b === "ローカルメディ";
    return b === businessFilter;
  };
  const effectiveFromDate = fromDate < R8_FUNNEL_START_DATE ? R8_FUNNEL_START_DATE : fromDate;
  const inRange = (d: string) => d >= effectiveFromDate && d <= toDate;

  const dateRange = enumerateDates(effectiveFromDate, toDate);
  const periodDays = Math.max(1, dateRange.length);

  // アカウント別集計
  const accMap = new Map<string, AccountSummary>();
  for (const a of accountTotals) {
    if (!matchBiz(a.business)) continue;
    accMap.set(a.id, {
      accountId: a.id,
      accountName: a.name,
      category: a.category,
      business: a.business,
      cumulativeTotal: a.total,
      periodLeads: 0,
      periodReservations: 0,
      campaigns: resolveCampaigns([...(campaignsByAccount.get(a.id) ?? [])]),
    });
  }

  // シナリオ別集計
  const sceMap = new Map<string, ScenarioSummary>();
  // 日次マップ（scenarioKey -> dateMap）
  const dailySceMap = new Map<string, Map<string, number>>();
  // 全体日次（カテゴリ別積み上げ）— メタ広告(合流)は重複なので metaAdMerged で別管理
  const totalDailyMap = new Map<string, { date: string; metaAd: number; metaAdMerged: number; youtube: number; sns: number; hpBlog: number; officialLine: number; reservation: number }>();
  const ensureTotalDay = (d: string) => {
    if (!totalDailyMap.has(d)) totalDailyMap.set(d, { date: d, metaAd: 0, metaAdMerged: 0, youtube: 0, sns: 0, hpBlog: 0, officialLine: 0, reservation: 0 });
    return totalDailyMap.get(d)!;
  };
  for (const d of dateRange) ensureTotalDay(d);

  const LEAD_CATS = ["メタ広告", "YouTube自然流入", "SNS自然流入", "HP/ブログ", "公式LINE"] as const;

  for (const l of utageLeads) {
    if (!inRange(l.date)) continue;
    if (!matchBiz(l.business)) continue;

    // アカウント側
    const acc = accMap.get(l.accountId);
    if (acc) {
      if ((LEAD_CATS as readonly string[]).includes(l.category)) {
        acc.periodLeads += l.count;
      } else if (l.category === "面談予約") {
        acc.periodReservations += l.count;
      }
    }

    // 日次（カテゴリ別積み上げ）
    const td = ensureTotalDay(l.date);
    if (l.category === "メタ広告") td.metaAd += l.count;
    else if (l.category === "メタ広告(合流)") td.metaAdMerged += l.count;
    else if (l.category === "YouTube自然流入") td.youtube += l.count;
    else if (l.category === "SNS自然流入") td.sns += l.count;
    else if (l.category === "HP/ブログ") td.hpBlog += l.count;
    else if (l.category === "公式LINE") td.officialLine += l.count;
    else if (l.category === "面談予約") td.reservation += l.count;

    // シナリオ別
    if (l.scenarioId) {
      const key = `${l.accountId}|${l.scenarioId}`;
      if (!sceMap.has(key)) {
        const sceCampaignIds = campaignMap.get(key) ?? [];
        sceMap.set(key, {
          accountId: l.accountId, scenarioId: l.scenarioId,
          accountName: l.accountName, scenarioName: l.scenarioName,
          category: l.category, business: l.business ?? "未分類",
          periodTotal: 0, dailyAverage: 0,
          campaigns: resolveCampaigns(sceCampaignIds),
        });
      }
      sceMap.get(key)!.periodTotal += l.count;

      // 日次（シナリオ別）
      if (!dailySceMap.has(key)) dailySceMap.set(key, new Map());
      const dm = dailySceMap.get(key)!;
      dm.set(l.date, (dm.get(l.date) ?? 0) + l.count);
    }
  }

  // 日平均計算
  for (const s of sceMap.values()) {
    s.dailyAverage = +(s.periodTotal / periodDays).toFixed(1);
  }

  // 日次シリーズに変換
  const dailyByScenario = new Map<string, DailySeriesPoint[]>();
  for (const [k, dm] of dailySceMap) {
    const arr = [...dm.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
    dailyByScenario.set(k, arr);
  }

  return {
    accounts: [...accMap.values()].sort((a, b) => b.cumulativeTotal - a.cumulativeTotal),
    scenarios: [...sceMap.values()].sort((a, b) => b.periodTotal - a.periodTotal),
    dailyByScenario,
    dailyTotals: [...totalDailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    periodDays,
  };
}

function enumerateDates(fromDate: string, toDate: string): string[] {
  const start = parseDate(fromDate);
  const end = parseDate(toDate);
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(formatDateUTC(d));
  }
  return dates;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function summarizeFunnelByCampaign(
  data: { consultations: ConsultationRow[]; ads: AdRow[] },
  fromYM: string,
  toYM: string,
): CampaignFunnelRow[] {
  const leadFromYM = fromYM < R8_FUNNEL_START_YM ? R8_FUNNEL_START_YM : fromYM;
  const inRange = (ym: string | null) =>
    ym !== null && ym >= leadFromYM && ym <= toYM;
  const map = new Map<string, CampaignFunnelRow>();

  for (const a of data.ads) {
    if (!inRange(a.yearMonth)) continue;
    const key = `${a.campaignName}|${a.business}`;
    const cur = map.get(key) ?? {
      campaignName: a.campaignName || "(キャンペーン未設定)",
      business: a.business,
      leadCount: 0,
      consultationCount: 0,
      trialCount: 0,
      enrollmentCount: 0,
    };
    cur.leadCount += a.leadCount;
    map.set(key, cur);
  }

  for (const c of data.consultations) {
    if (!inRange(c.meetingMonth)) continue;
    const key = `${c.campaignName}|${c.business}`;
    const cur = map.get(key) ?? {
      campaignName: c.campaignName || "(キャンペーン未設定)",
      business: c.business,
      leadCount: 0,
      consultationCount: 0,
      trialCount: 0,
      enrollmentCount: 0,
    };
    cur.consultationCount += 1;
    if (c.resultIsTrial) cur.trialCount += 1;
    map.set(key, cur);
  }

  return Array.from(map.values()).sort((a, b) =>
    b.consultationCount + b.leadCount - (a.consultationCount + a.leadCount)
  );
}
