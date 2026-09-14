import { getStudents } from "@/lib/students";
import StudentsView from "@/components/students/StudentsView";

export const revalidate = 600;

export default async function StudentsPage() {
  const students = await getStudents();

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

      <StudentsView students={students} />
    </div>
  );
}
