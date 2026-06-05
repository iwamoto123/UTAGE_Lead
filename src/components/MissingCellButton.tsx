"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MissingCellButton({
  yearMonth,
  business,
}: {
  yearMonth: string;
  business: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 楽観的UI: ボタン押下直後にUI更新する
  const [optimisticExempt, setOptimisticExempt] = useState(false);

  async function handleMarkDataless() {
    setLoading(true);
    setError(null);
    setOptimisticExempt(true); // 即座にUI更新
    setOpen(false);
    try {
      const res = await fetch("/api/mark-dataless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth, business, exempt: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setOptimisticExempt(false); // 失敗時はもとに戻す
        setOpen(true);
        throw new Error(json.error ?? "更新失敗");
      }
      router.refresh(); // バックグラウンドで再フェッチして確定
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 楽観的に「データなし」表示
  if (optimisticExempt) {
    return (
      <div className="inline-block px-2 py-1 rounded border bg-slate-200 text-slate-600 border-slate-400 text-xs font-medium">
        データなし
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-block px-2 py-1 rounded border bg-red-100 text-red-800 border-red-300 text-xs font-medium hover:bg-red-200 hover:border-red-500 transition-colors cursor-pointer"
      >
        未提出
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold">📥 未提出の対応</h2>
                <p className="text-xs text-slate-500 mt-1">対象: <strong>{yearMonth}</strong> ／ <strong>{business}</strong></p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-900 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="font-semibold mb-1">📂 1. データを提出する</p>
                <p className="text-xs text-slate-700">
                  以下のいずれかを <strong>Claude Code</strong> にドラッグ＆ドロップ or 貼り付けてください。Claudeが分類・按分・Notion登録まで自動で行います。
                </p>
                <ul className="text-xs text-slate-600 mt-2 space-y-0.5 list-disc list-inside">
                  <li>SAISONカード明細（広告費・SaaS・通信費・教材原価・固定資産など）</li>
                  <li>宮崎口座記帳CSV（月謝売上・業務委託・家賃・水道光熱費 など）</li>
                  <li>UTAGE売上一覧（教材売上・短期講座売上）</li>
                  <li>バイト振込シート（業務委託費・人件費）</li>
                </ul>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                <p className="font-semibold mb-1 text-emerald-900">📊 2. 広告費だけ自動転記したい</p>
                <p className="text-xs text-emerald-800">
                  ページ上部「📊 広告ボード→PL 自動転記」ボタンで、Notion週次広告レポートDBから一括反映できます。
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-300 rounded p-3 space-y-2">
                <p className="font-semibold text-amber-900">⚠ 3. 過去データがない・取得不能で「データなし」とする</p>
                <p className="text-xs text-amber-800">
                  運用開始前の月や、データが入手不能な月は「データなし」として未提出表示を消すことができます。後で取得できたら、Notion月次PL DBの「データなし免除」チェックを外してください。
                </p>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleMarkDataless}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                >
                  {loading ? "処理中…" : `✓ ${yearMonth} ${business} を「データなし」として確認済みにする`}
                </button>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
