"use client";

/** 生徒ダッシュボードの読み込みが失敗したときの画面。
 *  これが無いと、Vercelの英語のエラーページ（This page couldn't load）が出て
 *  何が起きたのか分からなくなる。 */
export default function StudentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">生徒ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">読み込みに失敗しました。</p>
      </div>

      <div className="rounded-xl border-l-[3px] border-[#DF8D33] bg-white p-4 shadow-sm">
        <p className="text-sm">
          Notionからの読み込みが途中で止まりました。時間をおくと直ることが多いので、
          まず「もう一度読み込む」を押してください。
        </p>
        <p className="mt-2 text-xs text-slate-500">
          何度やっても直らないときは、下のエラーIDを伝えてください。Vercelのログから原因を追えます。
        </p>
        <p className="mt-2 font-mono text-xs text-slate-600">
          {error.digest ? `エラーID: ${error.digest}` : error.message}
        </p>
        <button
          onClick={reset}
          className="mt-3 rounded-md bg-[#458BC3] px-3 py-1.5 text-xs font-bold text-white"
        >
          もう一度読み込む
        </button>
      </div>
    </div>
  );
}
