import { getStudents, type Student, type AlertLevel } from "@/lib/students";
import StudentFilters from "@/components/students/StudentFilters";

export const revalidate = 600;

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

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] leading-tight ${className}`}>
      {children}
    </span>
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
          {s.todo && <span className="mt-0.5 text-xs text-slate-600">📝 {s.todo.replace(/\n/g, " ").slice(0, 70)}</span>}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-600">
        <div>{s.trialStart ? `体験 ${s.trialStart.slice(5)}〜` : s.lastInterview ? `面談 ${s.lastInterview.slice(5)}` : "—"}</div>
        <div className="text-xs text-slate-400">
          {s.daysElapsed !== null ? `${s.daysElapsed}日経過` : "日付なし"}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-600">
        {s.lastCheck ? s.lastCheck.slice(5) : <span className="text-slate-400">未記録</span>}
      </td>

      <td className="px-3 py-2.5 text-xs text-slate-600">
        {s.weekFocus ? s.weekFocus.replace(/\n/g, " ").slice(0, 60) : <span className="text-slate-400">—</span>}
      </td>

      <td className="px-3 py-2.5 text-xs text-slate-500">{s.business}</td>
    </tr>
  );
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; business?: string }>;
}) {
  const sp = await searchParams;
  const all = await getStudents();

  const stage = sp.stage ?? "all";
  const business = sp.business ?? "all";
  const shown = all.filter(
    (s) => (stage === "all" || s.stage === stage) && (business === "all" || s.business === business)
  );

  const noTeacher = all.filter((s) => s.alerts.some((a) => a.label.startsWith("担当講師が未設定")));
  const red = all.filter((s) => s.alerts[0]?.level === "red");
  const milestone = all.filter((s) => s.alerts.some((a) => a.label.startsWith("今日が")));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">生徒ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">
            手を打つ必要がある生徒が上に来ます。担当講師が決まっていない生徒がいちばん上です。
          </p>
        </div>
        <span className="text-xs text-slate-400">
          正本は Notion「R8 面談・体験生徒」「R8 塾生」。名前をクリックすると開きます
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="担当が決まっていない" value={noTeacher.length} tone={noTeacher.length > 0 ? "red" : "ok"} />
        <Stat label="今日が継続確認・節目" value={milestone.length} tone={milestone.length > 0 ? "orange" : "ok"} />
        <Stat label="要対応（赤）" value={red.length} tone={red.length > 0 ? "red" : "ok"} />
        <Stat label="体験中・塾生・検討中" value={all.length} tone="plain" />
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
            担当が決まらないと勉強計画面談が組めません。講師を決めてNotionの担当講師に入れてください。
          </p>
        </div>
      )}

      <StudentFilters stage={stage} business={business} />

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">生徒</th>
              <th className="px-3 py-2 font-medium">担当講師</th>
              <th className="px-3 py-2 font-medium">手を打つ理由</th>
              <th className="px-3 py-2 font-medium">起点</th>
              <th className="px-3 py-2 font-medium">最終確認</th>
              <th className="px-3 py-2 font-medium">今週の重点</th>
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
