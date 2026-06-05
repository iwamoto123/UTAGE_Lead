"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PreviewRow {
  yearMonth: string;
  business: string;
  amount: number;
}

interface ApplyResult {
  yearMonth: string;
  business: string;
  amount: number;
  pageUrl: string;
}

interface Unclassified {
  campaignName: string;
  amount: number;
  weekCount: number;
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function BoardAdSyncButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [unclassified, setUnclassified] = useState<Unclassified[]>([]);
  const [results, setResults] = useState<ApplyResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPreview(null);
    setUnclassified([]);
    setResults(null);
    setError(null);
  }

  async function handlePreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/board-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "プレビュー失敗");
      setPreview(json.preview);
      setUnclassified(json.unclassified ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/board-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "登録失敗");
      setResults(json.results);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 月×事業のマトリクス用にデータ整形
  const months = preview ? Array.from(new Set(preview.map((p) => p.yearMonth))).sort() : [];
  const businesses = ["宮崎教室", "白谷塾オンライン", "ローカルメディ"];
  const map = new Map<string, number>();
  preview?.forEach((p) => map.set(`${p.yearMonth}|${p.business}`, p.amount));

  return (
    <>
      <button
        onClick={() => { setOpen(true); handlePreview(); }}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        📊 広告ボード→PL 自動転記
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <h2 className="font-bold text-lg">📊 Notion広告ボード→月次PL「広告費」列に転記</h2>
              <button onClick={() => { setOpen(false); reset(); }} className="text-slate-500 hover:text-slate-900 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {!results && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm space-y-1">
                    <p><strong>動作</strong>: Notion週次広告レポートDBの全レコードを「対象月（期間startの月）×事業」で集計し、月次PLの「広告費」列を一括更新します。</p>
                    <p><strong>事業判定</strong>: <a href="https://www.notion.so/9ad5f4f4d9ce4e789f996a7ea59da030" target="_blank" className="text-blue-600 underline">キャンペーンマスター</a>の「事業-年度」relationから判定。relationが未設定なら名前推測のフォールバック。</p>
                    <p><strong>上書き</strong>: 既存値があれば<strong>上書き</strong>されます（広告費は週次広告レポートが正のソース）</p>
                  </div>

                  {unclassified.length > 0 && (
                    <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm space-y-2">
                      <p className="font-semibold text-amber-900">⚠ キャンペーンマスターに「事業-年度」が未設定のキャンペーンがあります</p>
                      <p className="text-xs text-amber-800">下記キャンペーンは名前推測でフォールバック判定されています。正確に按分するには、<a href="https://www.notion.so/9ad5f4f4d9ce4e789f996a7ea59da030" target="_blank" className="text-blue-600 underline">キャンペーンマスター</a>を開いて、各キャンペーンの「事業-年度」relationを設定してください。設定後、もう一度このボタンを押すと再集計されます。</p>
                      <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto bg-white border border-amber-200 rounded p-2">
                        {unclassified.map((u) => (
                          <li key={u.campaignName} className="flex justify-between gap-3">
                            <span>{u.campaignName}</span>
                            <span className="tabular-nums text-amber-700">{u.weekCount}週 / {yen(u.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  {loading && !preview && (
                    <div className="text-center py-8 text-slate-500">集計中…</div>
                  )}

                  {preview && (
                    <>
                      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm">
                        集計結果: <strong>{preview.length}</strong> 件（{months.length}ヶ月 × 事業）の月次PL「広告費」列を更新します
                      </div>

                      <div className="border border-slate-200 rounded overflow-x-auto">
                        <table className="text-xs w-full">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="text-left px-2 py-1.5">対象月</th>
                              {businesses.map((b) => (
                                <th key={b} className="text-right px-2 py-1.5">{b}</th>
                              ))}
                              <th className="text-right px-2 py-1.5 bg-slate-200">合計</th>
                            </tr>
                          </thead>
                          <tbody>
                            {months.map((ym) => {
                              const rowTotal = businesses.reduce((acc, b) => acc + (map.get(`${ym}|${b}`) ?? 0), 0);
                              return (
                                <tr key={ym} className="border-t border-slate-100">
                                  <td className="px-2 py-1.5 font-medium">{ym}</td>
                                  {businesses.map((b) => {
                                    const v = map.get(`${ym}|${b}`) ?? 0;
                                    return (
                                      <td key={b} className="px-2 py-1.5 text-right tabular-nums">
                                        {v > 0 ? yen(v) : <span className="text-slate-300">−</span>}
                                      </td>
                                    );
                                  })}
                                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold bg-slate-50">{yen(rowTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleApply}
                          disabled={loading}
                          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {loading ? "登録中…" : "✓ この内容で月次PL「広告費」列を更新"}
                        </button>
                        <button onClick={() => { setOpen(false); reset(); }} className="px-4 py-2 border border-slate-300 rounded hover:bg-slate-50">
                          キャンセル
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {results && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                    ✓ {results.length}件のレコードを更新しました
                  </div>
                  <div className="border border-slate-200 rounded overflow-hidden max-h-96 overflow-y-auto">
                    <table className="text-xs w-full">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1.5">対象月</th>
                          <th className="text-left px-2 py-1.5">事業</th>
                          <th className="text-right px-2 py-1.5">金額</th>
                          <th className="text-left px-2 py-1.5">リンク</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-2 py-1.5">{r.yearMonth}</td>
                            <td className="px-2 py-1.5">{r.business}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{yen(r.amount)}</td>
                            <td className="px-2 py-1.5"><a href={r.pageUrl} target="_blank" className="text-blue-600 underline">開く</a></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => { setOpen(false); reset(); }}
                    className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800"
                  >
                    閉じる
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
