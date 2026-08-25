export function SkeletonPage({
  title,
  cards = 4,
  rows = 8,
}: {
  title: string;
  cards?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-lg font-bold text-slate-400">{title}</h1>
          <div className="h-3 w-64 rounded bg-slate-200" />
        </div>
        <div className="flex gap-3 flex-wrap">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="border-l-[3px] border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="h-5 w-20 rounded bg-slate-200" />
              <div className="mt-1 h-2.5 w-16 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </header>

      <div className="space-y-2">
        <div className="h-8 rounded bg-slate-100" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-7 rounded bg-slate-50" style={{ opacity: 1 - i * 0.07 }} />
        ))}
      </div>

      <p className="text-xs text-slate-400">Notion からデータを読み込んでいます…</p>
    </div>
  );
}
