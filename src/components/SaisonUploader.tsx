"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AllocationRow {
  yearMonth: string;
  business: string;
  amount: number;
  alreadyApplied: boolean;
}

interface Preview {
  yearMonth: string;
  total: number;
  breakdown: { miyazaki: number; online: number; localmedi: number };
  details: { date: string; shop: string; amount: number }[];
  allocations: AllocationRow[];
}

interface ApplyResult {
  yearMonth: string;
  business: string;
  amount: number;
  pageUrl: string;
  skipped: boolean;
  reason?: string;
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function SaisonUploader({
  autoOpen = false,
  contextLabel,
  onClose,
}: {
  autoOpen?: boolean;
  contextLabel?: string;
  onClose?: () => void;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [cardTotal, setCardTotal] = useState<number | null>(null);
  const [payDate, setPayDate] = useState<string | null>(null);
  const [results, setResults] = useState<ApplyResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setFileName(null);
    setCardTotal(null);
    setPayDate(null);
    setResults(null);
    setError(null);
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("apply", "false");
    try {
      const res = await fetch("/api/upload/saison", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "プレビュー失敗");
      setPreview(json.preview);
      setFileName(json.fileName);
      setCardTotal(json.cardTotal);
      setPayDate(json.payDate);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("apply", "true");
    try {
      const res = await fetch("/api/upload/saison", { method: "POST", body: fd });
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

  // 全レコードが既に登録済みかどうか
  const allAlreadyApplied = preview && preview.length > 0
    && preview.every((p) => p.allocations.every((a) => a.alreadyApplied));
  const someAlreadyApplied = preview && preview.some((p) => p.allocations.some((a) => a.alreadyApplied));

  return (
    <>
      {!autoOpen && (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
        >
          📥 SAISON明細アップロード
        </button>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">📥 SAISONカード明細アップロード</h2>
                {contextLabel && (
                  <p className="text-xs text-slate-500 mt-1">対象（情報）: <strong>{contextLabel}</strong> ※ファイル内に該当月があれば登録されます</p>
                )}
              </div>
              <button onClick={() => { setOpen(false); reset(); onClose?.(); }} className="text-slate-500 hover:text-slate-900 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {!results && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm space-y-1">
                    <p><strong>動作</strong>: SAISON_YYMM.csv のMeta広告（FACEBK*）を月別に集計し、月次PL「広告費（カード明細）」に登録します。</p>
                    <p><strong>事業按分</strong>: 週次広告レポートDBの値の比率で按分。データがなければ全額オンライン計上。</p>
                    <p><strong>二重登録防止</strong>: 同じファイル名で過去に登録された月×事業はスキップします。</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">CSVファイル選択</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }}
                      className="block w-full text-sm border border-slate-300 rounded p-2"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  {!preview && (
                    <button
                      onClick={handlePreview}
                      disabled={!file || loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? "解析中…" : "プレビュー"}
                    </button>
                  )}

                  {preview && (
                    <>
                      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm space-y-1">
                        {fileName && <p><strong>ファイル名</strong>: <code>{fileName}</code></p>}
                        {payDate && <p><strong>お支払日</strong>: {payDate}</p>}
                        {cardTotal !== null && <p><strong>カード請求総額</strong>: {yen(cardTotal)}</p>}
                        <p><strong>抽出した広告月数</strong>: {preview.length} ヶ月</p>
                      </div>

                      {allAlreadyApplied && (
                        <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm text-amber-900">
                          ⚠ <strong>このファイルは過去にすべて登録済みです</strong>。登録ボタンを押しても全項目がスキップされます。
                        </div>
                      )}
                      {!allAlreadyApplied && someAlreadyApplied && (
                        <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm text-amber-900">
                          ⚠ 一部の月×事業は既に登録済みです（下表「登録済」表示）。それらはスキップされ、新規分のみ登録されます。
                        </div>
                      )}

                      <div className="border border-slate-200 rounded overflow-hidden">
                        <table className="text-xs w-full">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="text-left px-2 py-1.5">対象月</th>
                              <th className="text-left px-2 py-1.5">事業</th>
                              <th className="text-right px-2 py-1.5">金額</th>
                              <th className="text-left px-2 py-1.5">状態</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.flatMap((p) =>
                              p.allocations.map((a, idx) => (
                                <tr key={`${p.yearMonth}-${a.business}-${idx}`} className={`border-t border-slate-100 ${a.alreadyApplied ? "bg-amber-50" : ""}`}>
                                  <td className="px-2 py-1.5 font-medium">{a.yearMonth}</td>
                                  <td className="px-2 py-1.5">{a.business}</td>
                                  <td className="px-2 py-1.5 text-right tabular-nums">{yen(a.amount)}</td>
                                  <td className="px-2 py-1.5">
                                    {a.alreadyApplied ? (
                                      <span className="text-amber-700 font-medium">⚠ 登録済</span>
                                    ) : (
                                      <span className="text-green-700">新規登録</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleApply}
                          disabled={loading || !!allAlreadyApplied}
                          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {loading ? "登録中…" : allAlreadyApplied ? "登録不可（全件登録済み）" : "✓ この内容でNotionに登録"}
                        </button>
                        <button onClick={() => setPreview(null)} className="px-4 py-2 border border-slate-300 rounded hover:bg-slate-50">
                          やり直す
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {results && (
                <>
                  <div className={`border rounded p-3 text-sm ${
                    results.filter((r) => !r.skipped).length > 0
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}>
                    ✓ 登録 {results.filter((r) => !r.skipped).length} 件 / スキップ {results.filter((r) => r.skipped).length} 件
                  </div>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="text-xs w-full">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left px-2 py-1.5">対象月</th>
                          <th className="text-left px-2 py-1.5">事業</th>
                          <th className="text-right px-2 py-1.5">金額</th>
                          <th className="text-left px-2 py-1.5">結果</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((a, i) => (
                          <tr key={i} className={`border-t border-slate-100 ${a.skipped ? "bg-amber-50" : ""}`}>
                            <td className="px-2 py-1.5">{a.yearMonth}</td>
                            <td className="px-2 py-1.5">{a.business}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{yen(a.amount)}</td>
                            <td className="px-2 py-1.5">
                              {a.skipped ? (
                                <span className="text-amber-700">⏭ スキップ ({a.reason})</span>
                              ) : (
                                <a href={a.pageUrl} target="_blank" className="text-blue-600 underline">✓ 登録 (Notionで開く)</a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => { setOpen(false); reset(); onClose?.(); }}
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
