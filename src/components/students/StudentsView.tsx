"use client";

import { useMemo, useState } from "react";
import type { Student, AlertLevel, Teacher } from "@/lib/students-core";

/**
 * 絞り込みはブラウザ側だけで行う。
 * URLを変えてサーバーへ往復すると、切り替えのたびに画面が止まって見えるため。
 */

const STAGES = ["すべて", "体験中", "塾生", "検討中"] as const;
const BUSINESSES = ["すべて", "白谷塾オンライン", "ローカルメディ", "宮崎教室"] as const;

const LEVEL_STYLE: Record<AlertLevel, string> = {
  red: "bg-rose-50 text-rose-700 border-rose-300",
  orange: "bg-amber-50 text-amber-800 border-amber-300",
  yellow: "bg-slate-100 text-slate-600 border-slate-300",
};

const ROW_ACCENT: Record<AlertLevel | "none", string> = {
  red: "border-l-4 border-l-rose-400",
  orange: "border-l-4 border-l-amber-400",
  yellow: "border-l-4 border-l-slate-300",
  none: "border-l-4 border-l-transparent",
};

const STAGE_STYLE: Record<string, string> = {
  体験中: "bg-blue-50 text-blue-700 border-blue-200",
  塾生: "bg-emerald-50 text-emerald-700 border-emerald-200",
  検討中: "bg-slate-100 text-slate-600 border-slate-300",
};

const GROUP_STYLE: Record<string, string> = {
  オンライン: "bg-blue-50 text-blue-700 border-blue-200",
  ローカルメディ: "bg-emerald-50 text-emerald-700 border-emerald-200",
  英検: "bg-violet-50 text-violet-700 border-violet-200",
};

const CAP_FILTERS = ["いま使う人", "回答あり", "未回答", "全員"] as const;

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] leading-tight ${className}`}>
      {children}
    </span>
  );
}

function Toggle({
  items,
  current,
  onChange,
}: {
  items: readonly string[];
  current: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded bg-slate-100 p-1">
      {items.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={current === v}
          className={[
            "rounded px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
            current === v
              ? "bg-[#458BC3] text-white shadow-sm"
              : "text-slate-600 hover:bg-white hover:text-[#458BC3]",
          ].join(" ")}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "red" | "orange" | "ok" | "plain" }) {
  const style =
    tone === "red"
      ? "border-rose-300 bg-rose-50 text-rose-700"
      : tone === "orange"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : tone === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-700";
  return (
    <div className={`rounded border px-4 py-3 ${style}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ s }: { s: Student }) {
  const top = s.alerts[0]?.level ?? "none";
  return (
    <tr className={`border-b border-slate-100 align-top hover:bg-slate-50 ${ROW_ACCENT[top]}`}>
      <td className="px-3 py-2.5">
        <a
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-slate-900 hover:text-[#458BC3] hover:underline"
        >
          {s.name}
        </a>
        <div className="mt-1 flex flex-wrap gap-1">
          <Chip className={STAGE_STYLE[s.stage] ?? "bg-slate-100 text-slate-600 border-slate-300"}>{s.stage}</Chip>
          {s.grade && <Chip className="bg-white text-slate-500 border-slate-200">{s.grade}</Chip>}
          {s.courses.map((c) => (
            <Chip key={c} className="bg-white text-slate-500 border-slate-200">
              {c}
            </Chip>
          ))}
        </div>
      </td>

      <td className="px-3 py-2.5 text-sm">
        {s.teachers.length > 0 ? (
          <span className="text-slate-700">{s.teachers.join("・")}</span>
        ) : s.teacherUnknown ? (
          <span className="text-slate-400">確認できません</span>
        ) : (
          <span className="font-semibold text-rose-600">未設定</span>
        )}
      </td>

      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-1">
          {s.alerts.length === 0 ? (
            <span className="text-sm text-slate-400">—</span>
          ) : (
            s.alerts.map((a) => (
              <Chip key={a.label} className={LEVEL_STYLE[a.level]}>
                {a.label}
              </Chip>
            ))
          )}
          {s.todo && (
            <span className="mt-0.5 text-xs text-slate-600">📝 {s.todo.replace(/\n/g, " ").slice(0, 70)}</span>
          )}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-600">
        <div>
          {s.trialStart
            ? `体験 ${s.trialStart.slice(5)}〜`
            : s.lastInterview
              ? `面談 ${s.lastInterview.slice(5)}`
              : "—"}
        </div>
        <div className="text-xs text-slate-400">{s.daysElapsed !== null ? `${s.daysElapsed}日経過` : "日付なし"}</div>
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-600">
        {s.lastCheck ? s.lastCheck.slice(5) : <span className="text-slate-400">未記録</span>}
      </td>

      <td className="px-3 py-2.5 text-xs text-slate-600">
        {s.reportStatus ? (
          <div className="text-slate-700">{s.reportStatus}</div>
        ) : (
          <div className="text-slate-400">日報の記録なし</div>
        )}
        {s.weekFocus && (
          <div className="mt-1 text-slate-500">重点: {s.weekFocus.replace(/\n/g, " ").slice(0, 50)}</div>
        )}
      </td>

      <td className="px-3 py-2.5 text-xs text-slate-500">{s.business}</td>
    </tr>
  );
}

function shortName(name: string): string {
  return name.replace(/（[^）]*）/g, "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

function TeacherCapacityPanel({
  teachers,
  eikenAvailable,
}: {
  teachers: Teacher[];
  eikenAvailable: boolean;
}) {
  const [capFilter, setCapFilter] = useState<string>("いま使う人");
  const answered = teachers.filter((t) => t.capacity).length;
  const pending = teachers.length - answered;

  const shown = useMemo(
    () =>
      teachers.filter((t) => {
        if (capFilter === "回答あり") return Boolean(t.capacity);
        if (capFilter === "未回答") return !t.capacity;
        if (capFilter === "いま使う人") return Boolean(t.capacity) || t.assignedCount > 0;
        return true;
      }),
    [teachers, capFilter]
  );

  return (
    <div className="rounded border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">講師の対応キャパ</div>
          <p className="mt-0.5 text-xs text-slate-500">
            新しい生徒を任せるときの一覧です。正本は Notion の講師DBです。
            {!eikenAvailable && " 英検コース講師DBが未接続のため、英検の講師は出ていません。"}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Toggle items={CAP_FILTERS} current={capFilter} onChange={setCapFilter} />
          <span className="text-xs text-slate-400">
            表示 {shown.length} ／ 回答 {answered} ／ 未回答 {pending}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">講師</th>
              <th className="px-3 py-2 font-medium">所属</th>
              <th className="px-3 py-2 font-medium">担当中</th>
              <th className="px-3 py-2 font-medium">これから対応できる人数</th>
              <th className="px-3 py-2 font-medium">二次添削・得意</th>
              <th className="px-3 py-2 font-medium">確認日</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    title={t.name}
                    className="font-medium text-slate-900 hover:text-[#458BC3] hover:underline"
                  >
                    {shortName(t.name)}
                  </a>
                  {t.status && t.status !== "稼働中" && (
                    <div className="mt-1">
                      <Chip className="bg-slate-100 text-slate-500 border-slate-200">{t.status}</Chip>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Chip className={GROUP_STYLE[t.group] ?? "bg-slate-100 text-slate-600 border-slate-300"}>
                    {t.group}
                  </Chip>
                </td>
                <td className="px-3 py-2.5 text-sm text-slate-700">
                  <div className="tabular-nums">{t.assignedCount}人</div>
                  {t.assignedNames.length > 0 && (
                    <div className="mt-0.5 text-xs text-slate-400">
                      {t.assignedNames.map(shortName).join("・")}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm">
                  {t.capacity ? (
                    <span className="text-slate-700">{t.capacity}</span>
                  ) : (
                    <span className="text-amber-700">未回答</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600">
                  {t.subjects || <span className="text-slate-400">—</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-600">
                  {t.confirmedDate ? t.confirmedDate.slice(5) : <span className="text-slate-400">—</span>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                  該当する講師はいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StudentsView({
  students,
  teachers,
  eikenAvailable,
}: {
  students: Student[];
  teachers: Teacher[];
  eikenAvailable: boolean;
}) {
  const [stage, setStage] = useState<string>("すべて");
  const [business, setBusiness] = useState<string>("すべて");

  const shown = useMemo(
    () =>
      students.filter(
        (s) => (stage === "すべて" || s.stage === stage) && (business === "すべて" || s.business === business)
      ),
    [students, stage, business]
  );

  const noTeacher = useMemo(
    () => students.filter((s) => s.alerts.some((a) => a.label.startsWith("担当講師が未設定"))),
    [students]
  );
  const milestone = useMemo(
    () => students.filter((s) => s.alerts.some((a) => a.label.startsWith("今日が"))),
    [students]
  );
  const red = useMemo(() => students.filter((s) => s.alerts[0]?.level === "red"), [students]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="担当が決まっていない" value={noTeacher.length} tone={noTeacher.length > 0 ? "red" : "ok"} />
        <Stat label="今日が継続確認・節目" value={milestone.length} tone={milestone.length > 0 ? "orange" : "ok"} />
        <Stat label="要対応（赤）" value={red.length} tone={red.length > 0 ? "red" : "ok"} />
        <Stat label="体験中・塾生・検討中" value={students.length} tone="plain" />
      </div>

      {noTeacher.length > 0 && (
        <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="text-sm font-semibold text-rose-800">担当講師が決まっていない生徒</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {noTeacher.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-rose-300 bg-white px-2 py-1 text-sm text-rose-700 hover:bg-rose-100"
              >
                {s.name}
                <span className="ml-1 text-xs text-rose-400">
                  {s.daysElapsed !== null ? `${s.daysElapsed}日` : ""}
                </span>
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs text-rose-700">
            担当が決まらないと勉強計画面談が組めません。下のキャパ表を見て、Notionの担当講師に入れてください。
          </p>
        </div>
      )}

      <TeacherCapacityPanel teachers={teachers} eikenAvailable={eikenAvailable} />

      <div className="flex flex-wrap items-center gap-2">
        <Toggle items={STAGES} current={stage} onChange={setStage} />
        <Toggle items={BUSINESSES} current={business} onChange={setBusiness} />
        <span className="ml-auto text-xs text-slate-400">{shown.length}名を表示中</span>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">生徒</th>
              <th className="px-3 py-2 font-medium">担当講師</th>
              <th className="px-3 py-2 font-medium">手を打つ理由</th>
              <th className="px-3 py-2 font-medium">起点</th>
              <th className="px-3 py-2 font-medium">最終確認</th>
              <th className="px-3 py-2 font-medium">日報・今週の重点</th>
              <th className="px-3 py-2 font-medium">事業</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <Row key={s.id} s={s} />
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                  該当する生徒はいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
