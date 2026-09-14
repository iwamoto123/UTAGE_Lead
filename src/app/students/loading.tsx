/** Notionからの読み込み中に、画面が固まったように見えないよう骨組みを出す */
export default function Loading() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">生徒ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">Notionから読み込んでいます…</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[70px] animate-pulse rounded border border-slate-200 bg-white" />
        ))}
      </div>

      <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
