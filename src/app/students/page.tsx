import { getStudentsPageData } from "@/lib/students";
import StudentsView from "@/components/students/StudentsView";

export const revalidate = 600;

/** 講師が見るLINE監視ダッシュボード。権限が分かれているので別アプリのまま残す */
const LINE_MONITOR_URL =
  process.env.LINE_MONITOR_URL ?? "https://line-monitor.iwamototake2155.workers.dev/dashboard";

export default async function StudentsPage() {
  const { students, teachers, eikenAvailable } = await getStudentsPageData();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">生徒ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">
            手を打つ必要がある生徒が上に来ます。担当講師が決まっていない生徒がいちばん上です。
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <a
            href={LINE_MONITOR_URL}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[#458BC3] hover:underline"
          >
            講師向けダッシュボード（LINE監視）→
          </a>
          <span className="text-xs text-slate-400">
            正本は Notion「R8 面談・体験生徒」「R8 塾生」。名前をクリックすると開きます
          </span>
        </div>
      </div>

      <StudentsView students={students} teachers={teachers} eikenAvailable={eikenAvailable} />
    </div>
  );
}
