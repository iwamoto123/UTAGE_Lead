import { idToBusiness, notionPageUrl } from "./notion";

/**
 * 生徒ダッシュボードの判定ロジック。
 *
 * Next の実行環境に依存しないので、`npm run check:students` から
 * そのまま呼び出して結果を確かめられる（devサーバーを起動しなくてよい）。
 */

/** 無料体験の日数。再受験・編入は2週間、ほかは1週間（CLAUDE.md「無料体験の期間」） */
export const TRIAL_DAYS_LONG = 14;
export const TRIAL_DAYS_SHORT = 7;

/** 節目チェックの日（体験開始日からの経過日数） */
const MILESTONES_SHORT = [1, 3, 5, 7];
const MILESTONES_LONG = [1, 3, 7, 10, 14];

/** 在籍中の生徒で最終確認日がこの日数以上前なら滞留とみなす */
const STALE_CHECK_DAYS = 7;

/** 面談後検討中でこの日数以上動きがなければ放置とみなす */
const CONSIDER_STALE_DAYS = 7;

/** 日報が止まったと見なす日数。体験中は様子を見る余地がないので塾生より1日短い（CLAUDE.md） */
const REPORT_GAP_TRIAL = 2;
const REPORT_GAP_ENROLLED = 3;

/**
 * Notionは、インテグレーションが参照権限を持たない先のリレーションを
 * 「プロパティは返すが中身は空」で返す。英検コース講師DBが未接続のままだと、
 * 担当が入っていても空に見えて「未設定」の赤が出てしまう。
 * 講師DBを読めたかどうかを受け取って、読めないときは判定不能として扱う。
 */
const EIKEN_COURSE = "英検コース";

export type AlertLevel = "red" | "orange" | "yellow";

export interface StudentAlert {
  level: AlertLevel;
  label: string;
  weight: number;
}

export type Stage = "体験中" | "塾生" | "検討中" | "その他";

export interface Student {
  id: string;
  url: string;
  name: string;
  source: "面談・体験" | "塾生";
  stage: Stage;
  status: string;
  result: string | null;
  business: string;
  grade: string | null;
  courses: string[];
  teachers: string[];
  /** 英検コース生で担当の有無が判定できない場合 true */
  teacherUnknown: boolean;
  aspiration: string;
  trialStart: string | null;
  lastInterview: string | null;
  lastCheck: string | null;
  condition: string | null;
  hasPolicy: boolean;
  weekFocus: string;
  goal: string;
  todo: string;
  /** line-monitorがNotionへ書き戻した日報の状況 */
  reportStatus: string;
  /** 日報（生徒側の発言）の最終提出日 */
  reportLastDate: string | null;
  /** 体験開始日（なければ最終面談日）からの経過日数 */
  daysElapsed: number | null;
  trialDays: number;
  alerts: StudentAlert[];
  score: number;
}

export interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

/* ---------------- Notion プロパティの読み取り ---------------- */

export function text(prop: unknown): string {
  const p = prop as { type?: string; title?: { plain_text: string }[]; rich_text?: { plain_text: string }[] };
  if (p?.type === "title") return p.title?.map((t) => t.plain_text).join("") ?? "";
  if (p?.type === "rich_text") return p.rich_text?.map((t) => t.plain_text).join("") ?? "";
  return "";
}

function selectName(prop: unknown): string | null {
  const p = prop as { type?: string; select?: { name: string } | null };
  return p?.type === "select" ? (p.select?.name ?? null) : null;
}

function multiSelectNames(prop: unknown): string[] {
  const p = prop as { type?: string; multi_select?: { name: string }[] };
  return p?.type === "multi_select" ? (p.multi_select?.map((o) => o.name) ?? []) : [];
}

function dateStart(prop: unknown): string | null {
  const p = prop as { type?: string; date?: { start: string } | null };
  return p?.type === "date" ? (p.date?.start ?? null) : null;
}

function relationIds(prop: unknown): string[] {
  const p = prop as { type?: string; relation?: { id: string }[] };
  return p?.type === "relation" ? (p.relation?.map((r) => r.id) ?? []) : [];
}

/** 未接続のリレーションはレスポンスから消えるので、キーの有無で接続状態が分かる */
function relationPresent(props: Record<string, unknown>, key: string): boolean {
  return props[key] !== undefined;
}

/* ---------------- 判定 ---------------- */

/** JSTの暦日どうしの差を取る。時刻は見ない */
export function daysBetween(from: string, to: Date): number {
  const f = Date.parse(`${from.slice(0, 10)}T00:00:00+09:00`);
  const jstToday = new Date(to.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  const t = Date.parse(`${jstToday}T00:00:00+09:00`);
  return Math.round((t - f) / 86400000);
}

function trialDaysFor(courses: string[]): number {
  const long = courses.some((c) => c.includes("再受験") || c.includes("編入"));
  return long ? TRIAL_DAYS_LONG : TRIAL_DAYS_SHORT;
}

function stageOf(status: string, result: string | null, source: Student["source"]): Stage {
  // 結果に入力があれば結果が正（CLAUDE.md「ステータスと結果の読み方」）
  if (result) return result === "体験後入塾" ? "塾生" : "その他";
  if (status === "塾生") return "塾生";
  if (status === "体験中") return "体験中";
  if (status === "面談後検討中") return "検討中";
  void source;
  return "その他";
}

export function buildAlerts(s: Omit<Student, "alerts" | "score">, today: Date): StudentAlert[] {
  const a: StudentAlert[] = [];
  const enrolled = s.stage === "体験中" || s.stage === "塾生";

  // 1. 担当講師が決まっていない ── いちばん上に出す
  if (enrolled && s.teachers.length === 0 && !s.teacherUnknown) {
    const since = s.daysElapsed !== null ? `・${s.daysElapsed}日経過` : "";
    a.push({ level: "red", label: `担当講師が未設定${since}`, weight: 100 });
  }

  // 2. 体験期間を過ぎたのに結果が入っていない
  if (s.stage === "体験中" && s.daysElapsed !== null && s.daysElapsed > s.trialDays) {
    a.push({
      level: "red",
      label: `体験期間を${s.daysElapsed - s.trialDays}日超過（${s.trialDays}日間／結果が未入力）`,
      weight: 95,
    });
  }

  // 3. 状態=要対応
  if (s.condition === "要対応") {
    a.push({ level: "red", label: "状態：要対応", weight: 90 });
  }

  // 4. 今日が継続確認の日／節目チェックの日
  if (s.stage === "体験中" && s.daysElapsed !== null && s.trialStart) {
    const milestones = s.trialDays === TRIAL_DAYS_LONG ? MILESTONES_LONG : MILESTONES_SHORT;
    if (s.daysElapsed === s.trialDays) {
      a.push({ level: "red", label: `今日が継続確認の日（体験${s.trialDays}日目）`, weight: 92 });
    } else if (milestones.includes(s.daysElapsed)) {
      a.push({ level: "orange", label: `今日が節目チェック（体験${s.daysElapsed}日目）`, weight: 75 });
    }
  }

  // 5. 体験中なのに体験開始日が入っていない＝勉強計画面談がまだ
  if (s.stage === "体験中" && !s.trialStart) {
    a.push({ level: "orange", label: "体験開始日が未記録（勉強計画面談が未実施）", weight: 78 });
  }

  // 6. 面談後検討中の放置
  if (s.stage === "検討中" && s.daysElapsed !== null && s.daysElapsed >= CONSIDER_STALE_DAYS) {
    a.push({ level: "orange", label: `面談から${s.daysElapsed}日フォローなし`, weight: 70 });
  }

  // 7. 日報が止まっている（line-monitorがNotionへ書き戻した内容を見る）
  if (enrolled && s.reportLastDate) {
    const gap = daysBetween(s.reportLastDate, today);
    const limit = s.stage === "体験中" ? REPORT_GAP_TRIAL : REPORT_GAP_ENROLLED;
    if (gap >= limit) {
      a.push({
        level: s.stage === "体験中" ? "red" : "orange",
        label: `日報が${gap}日止まっています（最終 ${s.reportLastDate.slice(5)}）`,
        weight: s.stage === "体験中" ? 88 : 72,
      });
    }
  }

  // 8. 最終確認日の滞留
  if (enrolled) {
    if (!s.lastCheck) {
      a.push({ level: "orange", label: "最終確認日が未記録", weight: 62 });
    } else {
      const d = daysBetween(s.lastCheck, today);
      if (d >= STALE_CHECK_DAYS) {
        a.push({ level: "orange", label: `${d}日間ようすを見ていない`, weight: 60 });
      }
    }
  }

  // 9. 方針カードが空
  if (enrolled && !s.hasPolicy) {
    a.push({ level: "yellow", label: "方針カードが未記入", weight: 40 });
  }

  // 10. 担当の有無が判定できない（英検コース講師DBが未接続）
  if (enrolled && s.teacherUnknown && s.teachers.length === 0) {
    a.push({ level: "yellow", label: "担当を確認できません（英検コース講師DBをNotionで接続してください）", weight: 45 });
  }

  return a.sort((x, y) => y.weight - x.weight);
}

/* ---------------- 組み立て ---------------- */

export type StudentCore = Omit<Student, "alerts" | "score">;

export function toCore(
  page: NotionPage,
  source: Student["source"],
  teacherNames: Map<string, string>,
  today: Date,
  eikenTeacherDbAvailable: boolean
): StudentCore {
  const p = page.properties;

  const status = selectName(p["ステータス"]) ?? "";
  const result = selectName(p["結果"]);
  const courses = multiSelectNames(p["コース"]);
  const stage = stageOf(status, result, source);

  const teacherKeys = ["担当講師（オンライン）", "担当講師（ローカルメディ）", "担当講師（英検）", "担当講師"];
  const teacherIds = teacherKeys.flatMap((k) => relationIds(p[k]));
  // 塾生DBの旧プロパティ（テキスト／セレクト）も担当ありとみなす
  const legacyTeacher = text(p["担当講師 1"]) || (selectName(p["担当講師 2"]) ?? "");

  const teachers = teacherIds.map((id) => teacherNames.get(id) ?? "（講師DB未接続）");
  if (legacyTeacher) teachers.push(legacyTeacher);

  // 英検コース生で、英検講師DBを読めていない＝担当の有無を判定できない
  const teacherUnknown =
    teachers.length === 0 &&
    courses.includes(EIKEN_COURSE) &&
    (!eikenTeacherDbAvailable || !relationPresent(p, "担当講師（英検）"));

  const trialStart = dateStart(p["体験開始日"]);
  const lastInterview = dateStart(p["最終面談日"]);
  const base = trialStart ?? lastInterview;
  const bizId = relationIds(p["事業-年度"])[0];

  const core: StudentCore = {
    id: page.id,
    url: notionPageUrl(page.id),
    name: text(p["名前"]),
    source,
    stage,
    status,
    result,
    business: bizId ? idToBusiness(bizId) : "その他",
    grade: selectName(p["学年"]) ?? selectName(p["現在の学年"]),
    courses,
    teachers: Array.from(new Set(teachers)),
    teacherUnknown,
    aspiration: text(p["志望大学学部学科"]),
    trialStart,
    lastInterview,
    lastCheck: dateStart(p["最終確認日"]),
    condition: selectName(p["状態"]),
    hasPolicy: text(p["方針"]).trim().length > 0,
    weekFocus: text(p["今週の重点"]),
    goal: text(p["今の目標"]),
    todo: text(p["対応しなければならないこと"]),
    reportStatus: text(p["日報の状況"]).trim(),
    reportLastDate: dateStart(p["日報最終提出日"]),
    daysElapsed: base ? daysBetween(base, today) : null,
    trialDays: trialDaysFor(courses),
  };

  return core;
}

const STAGE_RANK: Record<Stage, number> = { 塾生: 3, 体験中: 2, 検討中: 1, その他: 0 };

/**
 * 同じ生徒が面談・体験DBと塾生DBの両方に載っていることがある。
 * 進んでいるほうを軸にしつつ、空いている項目はもう一方から埋める。
 * 塾生DBには体験開始日が入っていないことが多く、単純に上書きすると
 * 「体験開始日が未記録」を取りこぼす。
 */
function mergeCore(primary: StudentCore, secondary: StudentCore): StudentCore {
  const pickDate = (a: string | null, b: string | null) => a ?? b;
  return {
    ...primary,
    trialStart: pickDate(primary.trialStart, secondary.trialStart),
    lastInterview: pickDate(primary.lastInterview, secondary.lastInterview),
    lastCheck: pickDate(primary.lastCheck, secondary.lastCheck),
    condition: primary.condition ?? secondary.condition,
    grade: primary.grade ?? secondary.grade,
    hasPolicy: primary.hasPolicy || secondary.hasPolicy,
    weekFocus: primary.weekFocus || secondary.weekFocus,
    goal: primary.goal || secondary.goal,
    todo: primary.todo || secondary.todo,
    aspiration: primary.aspiration || secondary.aspiration,
    reportStatus: primary.reportStatus || secondary.reportStatus,
    reportLastDate: pickDate(primary.reportLastDate, secondary.reportLastDate),
    business: primary.business !== "その他" ? primary.business : secondary.business,
    courses: Array.from(new Set([...primary.courses, ...secondary.courses])),
    teachers: Array.from(new Set([...primary.teachers, ...secondary.teachers])),
    teacherUnknown: primary.teacherUnknown && secondary.teacherUnknown,
  };
}

export function assembleStudents(
  taiken: NotionPage[],
  jukusei: NotionPage[],
  teacherNames: Map<string, string>,
  today: Date,
  eikenTeacherDbAvailable = true
): Student[] {
  const cores = [
    ...taiken.map((p) => toCore(p, "面談・体験", teacherNames, today, eikenTeacherDbAvailable)),
    ...jukusei.map((p) => toCore(p, "塾生", teacherNames, today, eikenTeacherDbAvailable)),
  ];

  const byName = new Map<string, StudentCore>();
  for (const c of cores) {
    const key = c.name.replace(/\s+/g, "");
    if (!key) continue;
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, c);
      continue;
    }
    // 段階が進んでいるほうを軸にする。同じなら塾生DB側を軸にする
    const primaryIsNew =
      STAGE_RANK[c.stage] > STAGE_RANK[prev.stage] ||
      (STAGE_RANK[c.stage] === STAGE_RANK[prev.stage] && c.source === "塾生");
    byName.set(key, primaryIsNew ? mergeCore(c, prev) : mergeCore(prev, c));
  }

  // 経過日数はマージ後の起点で数え直す
  const merged = Array.from(byName.values()).map((c): StudentCore => {
    const base = c.trialStart ?? c.lastInterview;
    return { ...c, daysElapsed: base ? daysBetween(base, today) : null };
  });

  return merged
    .filter((c) => c.stage !== "その他")
    .map((c): Student => {
      const alerts = buildAlerts(c, today);
      return { ...c, alerts, score: alerts.length ? alerts[0].weight : 0 };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = a.daysElapsed ?? -1;
      const db = b.daysElapsed ?? -1;
      if (db !== da) return db - da;
      return a.name.localeCompare(b.name, "ja");
    });
}

/* ---------------- 講師キャパ ---------------- */

export const TEACHER_GROUPS = ["オンライン", "ローカルメディ", "英検"] as const;
export type TeacherGroup = (typeof TEACHER_GROUPS)[number];

export interface Teacher {
  id: string;
  url: string;
  name: string;
  group: TeacherGroup;
  status: string | null;
  capacity: string;
  subjects: string;
  confirmedDate: string | null;
  assignedCount: number;
  assignedNames: string[];
}

/** 見送りは一覧に出さない。休止は残して「今は増やせない」と分かるようにする */
export function toTeacher(page: NotionPage, group: TeacherGroup): Teacher | null {
  const p = page.properties;
  const name = text(p["講師名"]) || text(p["名前"]) || text(p["氏名"]);
  if (!name) return null;
  const status = selectName(p["ステータス"]);
  if (status === "見送り") return null;
  return {
    id: page.id,
    url: notionPageUrl(page.id),
    name,
    group,
    status,
    capacity: text(p["対応可能キャパ"]).trim(),
    subjects: text(p["二次添削可能科目"]).trim(),
    confirmedDate: dateStart(p["キャパ確認日"]),
    assignedCount: 0,
    assignedNames: [],
  };
}

/**
 * 体験中・塾生の担当人数を講師へ載せる。
 * 検討中はまだ任せていないので数えない。
 */
export function attachTeacherAssignments(teachers: Teacher[], students: Student[]): Teacher[] {
  const byName = new Map<string, Teacher[]>();
  const out = teachers.map((t) => ({ ...t, assignedCount: 0, assignedNames: [] as string[] }));
  for (const t of out) {
    const list = byName.get(t.name) ?? [];
    list.push(t);
    byName.set(t.name, list);
  }

  for (const s of students) {
    if (s.stage !== "体験中" && s.stage !== "塾生") continue;
    for (const n of s.teachers) {
      const hits = byName.get(n);
      if (!hits) continue;
      for (const t of hits) {
        if (t.assignedNames.includes(s.name)) continue;
        t.assignedNames.push(s.name);
        t.assignedCount = t.assignedNames.length;
      }
    }
  }

  return out.sort((a, b) => {
    const ar = a.capacity ? 0 : 1;
    const br = b.capacity ? 0 : 1;
    if (ar !== br) return ar - br;
    if (b.assignedCount !== a.assignedCount) return b.assignedCount - a.assignedCount;
    const g = TEACHER_GROUPS.indexOf(a.group) - TEACHER_GROUPS.indexOf(b.group);
    if (g !== 0) return g;
    return a.name.localeCompare(b.name, "ja");
  });
}
