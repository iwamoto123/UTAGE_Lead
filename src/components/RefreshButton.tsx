"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handle() {
    setMsg(null);
    startTransition(async () => {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (res.ok) {
        setMsg("更新しました");
        router.refresh();
      } else {
        setMsg("失敗");
      }
      setTimeout(() => setMsg(null), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
      <button
        onClick={handle}
        disabled={pending}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "更新中…" : "🔄 リフレッシュ"}
      </button>
    </div>
  );
}
