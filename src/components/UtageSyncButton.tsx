"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function UtageSyncButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handle() {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/sync/utage", { method: "POST" });
        const json = await res.json();
        if (res.ok && json.ok) {
          const s = json.stats;
          setMsg(`✓ 新規${s.created} / 更新${s.updated}${s.skipped > 0 ? ` / スキップ${s.skipped}` : ""}`);
          router.refresh();
        } else {
          setMsg(`失敗: ${json.error ?? "unknown"}`);
        }
      } catch (e: any) {
        setMsg(`失敗: ${e?.message ?? e}`);
      }
      setTimeout(() => setMsg(null), 4000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handle}
        disabled={pending}
        className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
        title="ローカルJSONスナップショット → Notion 日次リード数DB に再投入"
      >
        {pending ? "同期中…" : "📡 UTAGE同期"}
      </button>
      {msg && <span className="text-[11px] text-slate-600">{msg}</span>}
    </div>
  );
}
