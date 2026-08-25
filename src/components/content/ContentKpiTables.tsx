"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { YoutubeKpi, LineKpi } from "@/lib/content-kpi";

type Kind = "youtube" | "line";

/* ── 共通の入力パーツ ── */
function Cell({ children, w }: { children: React.ReactNode; w?: string }) {
  return <td className="border border-slate-200 p-0" style={w ? { width: w } : undefined}>{children}</td>;
}

const inputCls =
  "w-full bg-transparent px-2 py-1.5 text-xs outline-none focus:bg-[#eef4fa] focus:ring-1 focus:ring-[#458BC3]";

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}
function NumInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" step="any" {...props} className={`${inputCls} text-right tabular-nums`} />;
}
function PctInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  // 画面は % 表記、保存は 0〜1 の小数
  return <input type="number" step="0.1" {...props} className={`${inputCls} text-right tabular-nums`} />;
}
function Select({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void; options: readonly string[]; placeholder: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} cursor-pointer`}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function pctToView(v: number | null): string {
  return v === null || v === undefined ? "" : String(Math.round(v * 1000) / 10);
}
function pctToStore(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n / 100 : null;
}

/* ── 保存フック ── */
function useSaver(kind: Kind) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function save(row: Record<string, unknown>) {
    setError(null);
    const res = await fetch("/api/content-kpi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, row }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "保存に失敗しました");
      return false;
    }
    start(() => router.refresh());
    return true;
  }

  async function remove(id: string) {
    if (!confirm("この行を削除しますか？")) return;
    setError(null);
    const res = await fetch("/api/content-kpi", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError("削除に失敗しました");
      return;
    }
    start(() => router.refresh());
  }

  return { save, remove, pending, error };
}

/* ── YouTube ── */
export function YoutubeKpiTable({
  rows, channels,
}: { rows: YoutubeKpi[]; channels: readonly string[] }) {
  const { save, remove, pending, error } = useSaver("youtube");
  const [draft, setDraft] = useState<Record<string, any>>({});

  const blank = {
    title: "", url: "", channel: "", publishedAt: "", giveaway: "",
    lineAdds: "", views: "", thumbCtr: "", retention: "", routeKey: "",
  };
  const [nw, setNw] = useState<Record<string, any>>(blank);

  function edit(id: string, patch: Record<string, unknown>) {
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }
  function valueOf(r: YoutubeKpi, key: keyof YoutubeKpi) {
    const d = draft[r.id];
    return d && key in d ? d[key] : r[key];
  }
  async function commit(r: YoutubeKpi) {
    const d = draft[r.id];
    if (!d) return;
    const ok = await save({ id: r.id, ...d, measuredAt: new Date().toISOString().slice(0, 10) });
    if (ok) setDraft((x) => { const c = { ...x }; delete c[r.id]; return c; });
  }
  async function add() {
    if (!nw.title) return;
    const ok = await save({
      ...nw,
      lineAdds: nw.lineAdds === "" ? null : Number(nw.lineAdds),
      views: nw.views === "" ? null : Number(nw.views),
      thumbCtr: pctToStore(nw.thumbCtr),
      retention: pctToStore(nw.retention),
      measuredAt: new Date().toISOString().slice(0, 10),
    });
    if (ok) setNw(blank);
  }

  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold">YouTube</h2>
          <p className="text-[11px] text-slate-500">
            セルを直接編集して Enter か Tab で保存。クリック率・維持率は % で入力（内部は小数で保存）。
          </p>
        </div>
        {pending && <span className="text-[11px] text-[#458BC3]">保存中…</span>}
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-left">
              {["動画タイトル", "リンク", "チャンネル", "公開日", "経過", "追加プレゼントの内容",
                "LINE追加", "再生数", "サムネCTR", "維持率", "CVR", ""].map((h) => (
                <th key={h} className="border border-slate-200 px-2 py-1.5 font-bold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dirty = !!draft[r.id];
              return (
                <tr key={r.id} className={dirty ? "bg-[#fffdf5]" : "hover:bg-slate-50"}>
                  <Cell w="18%">
                    <TextInput value={valueOf(r, "title") ?? ""}
                      onChange={(e) => edit(r.id, { title: e.target.value })} onBlur={() => commit(r)} />
                  </Cell>
                  <Cell w="9%">
                    <TextInput value={valueOf(r, "url") ?? ""} placeholder="https://"
                      onChange={(e) => edit(r.id, { url: e.target.value })} onBlur={() => commit(r)} />
                  </Cell>
                  <Cell w="11%">
                    <Select value={valueOf(r, "channel") ?? ""} options={channels} placeholder="—"
                      onChange={(v) => { edit(r.id, { channel: v }); setTimeout(() => commit(r), 0); }} />
                  </Cell>
                  <Cell w="8%">
                    <TextInput type="date" value={valueOf(r, "publishedAt") ?? ""}
                      onChange={(e) => edit(r.id, { publishedAt: e.target.value })} onBlur={() => commit(r)} />
                  </Cell>
                  <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums text-slate-500">
                    {r.daysSincePublish === null ? "—" : `${r.daysSincePublish}日`}
                  </td>
                  <Cell w="14%">
                    <TextInput value={valueOf(r, "giveaway") ?? ""} placeholder="概要欄の特典"
                      onChange={(e) => edit(r.id, { giveaway: e.target.value })} onBlur={() => commit(r)} />
                  </Cell>
                  <Cell w="7%">
                    <NumInput value={valueOf(r, "lineAdds") ?? ""}
                      onChange={(e) => edit(r.id, { lineAdds: e.target.value === "" ? null : Number(e.target.value) })}
                      onBlur={() => commit(r)} />
                  </Cell>
                  <Cell w="7%">
                    <NumInput value={valueOf(r, "views") ?? ""}
                      onChange={(e) => edit(r.id, { views: e.target.value === "" ? null : Number(e.target.value) })}
                      onBlur={() => commit(r)} />
                  </Cell>
                  <Cell w="7%">
                    <PctInput value={draft[r.id]?._ctr ?? pctToView(r.thumbCtr)}
                      onChange={(e) => edit(r.id, { _ctr: e.target.value, thumbCtr: pctToStore(e.target.value) })}
                      onBlur={() => commit(r)} />
                  </Cell>
                  <Cell w="7%">
                    <PctInput value={draft[r.id]?._ret ?? pctToView(r.retention)}
                      onChange={(e) => edit(r.id, { _ret: e.target.value, retention: pctToStore(e.target.value) })}
                      onBlur={() => commit(r)} />
                  </Cell>
                  <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums font-bold text-[#2e6a9e]">
                    {r.cvr ? `${(r.cvr * 100).toFixed(2)}%` : "—"}
                  </td>
                  <td className="border border-slate-200 px-1 text-center">
                    <button onClick={() => remove(r.id)}
                      className="text-slate-400 hover:text-red-600 px-1" title="削除">×</button>
                  </td>
                </tr>
              );
            })}

            {/* 新規行 */}
            <tr className="bg-[#f9fafb]">
              <Cell><TextInput value={nw.title} placeholder="＋ 動画タイトル"
                onChange={(e) => setNw({ ...nw, title: e.target.value })} /></Cell>
              <Cell><TextInput value={nw.url} placeholder="https://"
                onChange={(e) => setNw({ ...nw, url: e.target.value })} /></Cell>
              <Cell><Select value={nw.channel} options={channels} placeholder="—"
                onChange={(v) => setNw({ ...nw, channel: v })} /></Cell>
              <Cell><TextInput type="date" value={nw.publishedAt}
                onChange={(e) => setNw({ ...nw, publishedAt: e.target.value })} /></Cell>
              <td className="border border-slate-200" />
              <Cell><TextInput value={nw.giveaway} placeholder="概要欄の特典"
                onChange={(e) => setNw({ ...nw, giveaway: e.target.value })} /></Cell>
              <Cell><NumInput value={nw.lineAdds}
                onChange={(e) => setNw({ ...nw, lineAdds: e.target.value })} /></Cell>
              <Cell><NumInput value={nw.views}
                onChange={(e) => setNw({ ...nw, views: e.target.value })} /></Cell>
              <Cell><PctInput value={nw.thumbCtr}
                onChange={(e) => setNw({ ...nw, thumbCtr: e.target.value })} /></Cell>
              <Cell><PctInput value={nw.retention}
                onChange={(e) => setNw({ ...nw, retention: e.target.value })} /></Cell>
              <td className="border border-slate-200" />
              <td className="border border-slate-200 text-center">
                <button onClick={add} disabled={!nw.title}
                  className="text-[11px] font-bold text-[#458BC3] disabled:text-slate-300 px-1">追加</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── LINE配信 ── */
export function LineKpiTable({
  rows, accounts, genres, writers,
}: {
  rows: LineKpi[]; accounts: readonly string[]; genres: readonly string[]; writers: readonly string[];
}) {
  const { save, remove, pending, error } = useSaver("line");
  const [draft, setDraft] = useState<Record<string, any>>({});
  const blank = { title: "", account: "", genre: "", sentAt: "", sentCount: "", openRate: "", clickRate: "", writer: "" };
  const [nw, setNw] = useState<Record<string, any>>(blank);

  function edit(id: string, patch: Record<string, unknown>) {
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }
  function valueOf(r: LineKpi, key: keyof LineKpi) {
    const d = draft[r.id];
    return d && key in d ? d[key] : r[key];
  }
  async function commit(r: LineKpi) {
    const d = draft[r.id];
    if (!d) return;
    const ok = await save({ id: r.id, ...d, measuredAt: new Date().toISOString().slice(0, 10) });
    if (ok) setDraft((x) => { const c = { ...x }; delete c[r.id]; return c; });
  }
  async function add() {
    if (!nw.title) return;
    const ok = await save({
      ...nw,
      sentCount: nw.sentCount === "" ? null : Number(nw.sentCount),
      openRate: pctToStore(nw.openRate),
      clickRate: pctToStore(nw.clickRate),
      measuredAt: new Date().toISOString().slice(0, 10),
    });
    if (ok) setNw(blank);
  }

  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold">LINE配信</h2>
          <p className="text-[11px] text-slate-500">開封率・クリック率は % で入力。</p>
        </div>
        {pending && <span className="text-[11px] text-[#458BC3]">保存中…</span>}
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-left">
              {["配信内容", "公式LINEアカウント", "ジャンル", "配信日", "原稿", "配信数", "開封率", "クリック率", ""].map((h) => (
                <th key={h} className="border border-slate-200 px-2 py-1.5 font-bold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={draft[r.id] ? "bg-[#fffdf5]" : "hover:bg-slate-50"}>
                <Cell w="26%">
                  <TextInput value={valueOf(r, "title") ?? ""}
                    onChange={(e) => edit(r.id, { title: e.target.value })} onBlur={() => commit(r)} />
                </Cell>
                <Cell w="20%">
                  <Select value={valueOf(r, "account") ?? ""} options={accounts} placeholder="—"
                    onChange={(v) => { edit(r.id, { account: v }); setTimeout(() => commit(r), 0); }} />
                </Cell>
                <Cell w="12%">
                  <Select value={valueOf(r, "genre") ?? ""} options={genres} placeholder="—"
                    onChange={(v) => { edit(r.id, { genre: v }); setTimeout(() => commit(r), 0); }} />
                </Cell>
                <Cell w="10%">
                  <TextInput type="date" value={valueOf(r, "sentAt") ?? ""}
                    onChange={(e) => edit(r.id, { sentAt: e.target.value })} onBlur={() => commit(r)} />
                </Cell>
                <Cell w="9%">
                  <Select value={valueOf(r, "writer") ?? ""} options={writers} placeholder="—"
                    onChange={(v) => { edit(r.id, { writer: v }); setTimeout(() => commit(r), 0); }} />
                </Cell>
                <Cell w="8%">
                  <NumInput value={valueOf(r, "sentCount") ?? ""}
                    onChange={(e) => edit(r.id, { sentCount: e.target.value === "" ? null : Number(e.target.value) })}
                    onBlur={() => commit(r)} />
                </Cell>
                <Cell w="8%">
                  <PctInput value={draft[r.id]?._open ?? pctToView(r.openRate)}
                    onChange={(e) => edit(r.id, { _open: e.target.value, openRate: pctToStore(e.target.value) })}
                    onBlur={() => commit(r)} />
                </Cell>
                <Cell w="8%">
                  <PctInput value={draft[r.id]?._click ?? pctToView(r.clickRate)}
                    onChange={(e) => edit(r.id, { _click: e.target.value, clickRate: pctToStore(e.target.value) })}
                    onBlur={() => commit(r)} />
                </Cell>
                <td className="border border-slate-200 px-1 text-center">
                  <button onClick={() => remove(r.id)}
                    className="text-slate-400 hover:text-red-600 px-1" title="削除">×</button>
                </td>
              </tr>
            ))}

            <tr className="bg-[#f9fafb]">
              <Cell><TextInput value={nw.title} placeholder="＋ 配信内容"
                onChange={(e) => setNw({ ...nw, title: e.target.value })} /></Cell>
              <Cell><Select value={nw.account} options={accounts} placeholder="—"
                onChange={(v) => setNw({ ...nw, account: v })} /></Cell>
              <Cell><Select value={nw.genre} options={genres} placeholder="—"
                onChange={(v) => setNw({ ...nw, genre: v })} /></Cell>
              <Cell><TextInput type="date" value={nw.sentAt}
                onChange={(e) => setNw({ ...nw, sentAt: e.target.value })} /></Cell>
              <Cell><Select value={nw.writer} options={writers} placeholder="—"
                onChange={(v) => setNw({ ...nw, writer: v })} /></Cell>
              <Cell><NumInput value={nw.sentCount}
                onChange={(e) => setNw({ ...nw, sentCount: e.target.value })} /></Cell>
              <Cell><PctInput value={nw.openRate}
                onChange={(e) => setNw({ ...nw, openRate: e.target.value })} /></Cell>
              <Cell><PctInput value={nw.clickRate}
                onChange={(e) => setNw({ ...nw, clickRate: e.target.value })} /></Cell>
              <td className="border border-slate-200 text-center">
                <button onClick={add} disabled={!nw.title}
                  className="text-[11px] font-bold text-[#458BC3] disabled:text-slate-300 px-1">追加</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
