"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { YoutubeKpi, LineKpi } from "@/lib/content-kpi";

type Kind = "youtube" | "line";
type SortDir = "asc" | "desc";

/* ── 列の定義 ── */
interface Col {
  key: string;            // 並べ替えのキー。"" は並べ替え不可の列
  label: string;
  w?: string;
  num?: boolean;          // 数値列。右寄せ＋初回クリックで降順（上位から）
  hint?: string;
}

/* ── 共通の入力パーツ ── */
const inputCls =
  "w-full bg-transparent px-2.5 py-2 text-xs outline-none rounded-md " +
  "focus:bg-white focus:ring-2 focus:ring-[#458BC3]/40 transition-colors";

function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-0.5 py-0.5 ${className}`}>{children}</td>;
}
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
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} cursor-pointer`}>
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

/* ── 並べ替え ──
   ヘッダーをクリックで並べ替え。数値列は初回クリックで降順＝上位から並ぶ。
   値が空の行は昇順・降順どちらでも常に最後に置く（空欄が1位になると読めないため）。 */
function useSorted<T extends Record<string, any>>(
  rows: T[], cols: Col[], defaultKey: string, defaultDir: SortDir,
) {
  const [key, setKey] = useState(defaultKey);
  const [dir, setDir] = useState<SortDir>(defaultDir);

  const sorted = useMemo(() => {
    const col = cols.find((c) => c.key === key);
    return [...rows].sort((a, b) => {
      const av = a[key], bv = b[key];
      const aEmpty = av === null || av === undefined || av === "";
      const bEmpty = bv === null || bv === undefined || bv === "";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      const c = col?.num
        ? Number(av) - Number(bv)
        : String(av).localeCompare(String(bv), "ja");
      return dir === "asc" ? c : -c;
    });
  }, [rows, cols, key, dir]);

  function toggle(c: Col) {
    if (!c.key) return;
    if (c.key === key) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setKey(c.key); setDir(c.num ? "desc" : "asc"); }
  }
  return { sorted, key, dir, toggle };
}

/* ヘッダー。sticky で画面上部に貼りつく */
function Thead({
  cols, sortKey, dir, onSort, rank,
}: { cols: Col[]; sortKey: string; dir: SortDir; onSort: (c: Col) => void; rank: boolean }) {
  return (
    <thead className="sticky top-0 z-20">
      <tr>
        {rank && (
          <th className="bg-slate-50/95 backdrop-blur border-b border-slate-200 px-2 py-2.5
                         text-[11px] font-semibold text-slate-400 w-9 text-center">#</th>
        )}
        {cols.map((c) => {
          const active = c.key === sortKey;
          return (
            <th key={c.label} style={c.w ? { width: c.w } : undefined}
              className={`bg-slate-50/95 backdrop-blur border-b border-slate-200 px-2 py-2.5
                          text-[11px] font-semibold whitespace-nowrap
                          ${c.num ? "text-right" : "text-left"}
                          ${active ? "text-[#2e6a9e]" : "text-slate-500"}`}>
              {c.key ? (
                <button onClick={() => onSort(c)} title={c.hint ?? "クリックで並べ替え"}
                  className={`inline-flex items-center gap-1 rounded px-1 -mx-1 py-0.5
                              hover:bg-slate-200/70 transition-colors
                              ${c.num ? "flex-row-reverse" : ""}`}>
                  <span>{c.label}</span>
                  <span className={`text-[9px] leading-none ${active ? "text-[#DF8D33]" : "text-slate-300"}`}>
                    {active ? (dir === "desc" ? "▼" : "▲") : "⇅"}
                  </span>
                </button>
              ) : c.label}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function Ro({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={`px-2.5 py-2 text-xs tabular-nums ${right ? "text-right" : ""}`}>{children}</td>
  );
}

/* 表の外枠。縦にもスクロールさせることで thead の sticky が効く */
function TableBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="max-h-[72vh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">{children}</table>
      </div>
    </div>
  );
}

function SectionHead({
  title, note, count, pending, error,
}: { title: string; note: string; count: number; pending: boolean; error: string | null }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h2 className="text-sm font-bold flex items-center gap-2">
          {title}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {count}件
          </span>
        </h2>
        <p className="text-[11px] text-slate-500">{note}</p>
      </div>
      <div className="flex items-center gap-3">
        {pending && <span className="text-[11px] text-[#458BC3]">保存中…</span>}
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>
    </div>
  );
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

const rowCls = (dirty: boolean) =>
  `border-b border-slate-100 transition-colors ${dirty ? "bg-[#fffdf5]" : "hover:bg-[#f5f9fd]"}`;

/* ── YouTube ── */
const YT_COLS: Col[] = [
  { key: "title", label: "動画タイトル", w: "22%" },
  { key: "", label: "リンク", w: "5%" },
  { key: "channel", label: "チャンネル", w: "11%" },
  { key: "publishedAt", label: "公開日", w: "8%" },
  { key: "daysSincePublish", label: "経過", w: "5%", num: true },
  { key: "views", label: "再生数", w: "7%", num: true },
  { key: "thumbCtr", label: "サムネCTR", w: "7%", num: true },
  { key: "retention", label: "維持率", w: "7%", num: true },
  { key: "lineAdds", label: "LINE追加", w: "7%", num: true },
  { key: "cvr", label: "CVR", w: "7%", num: true, hint: "LINE追加 ÷ 再生数" },
  { key: "giveaway", label: "特典", w: "10%" },
  { key: "", label: "", w: "3%" },
];

export function YoutubeKpiTable({
  rows, channels,
}: { rows: YoutubeKpi[]; channels: readonly string[] }) {
  const { save, remove, pending, error } = useSaver("youtube");
  const [draft, setDraft] = useState<Record<string, any>>({});
  const { sorted, key, dir, toggle } = useSorted(rows, YT_COLS, "publishedAt", "desc");

  const blank = {
    title: "", url: "", channel: "", publishedAt: "", giveaway: "",
    lineAdds: "", views: "", thumbCtr: "", retention: "", routeKey: "",
  };
  const [nw, setNw] = useState<Record<string, any>>(blank);

  function edit(id: string, patch: Record<string, unknown>) {
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }
  function valueOf(r: YoutubeKpi, k: keyof YoutubeKpi) {
    const d = draft[r.id];
    return d && k in d ? d[k] : r[k];
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
      <SectionHead
        title="YouTube" count={rows.length} pending={pending} error={error}
        note="見出しをクリックで並べ替え（数値は1回目で上位から）。セルを直接編集して Enter か Tab で保存。CTR・維持率は % で入力。"
      />
      <TableBox>
        <Thead cols={YT_COLS} sortKey={key} dir={dir} onSort={toggle} rank />
        <tbody>
          {sorted.map((r, i) => {
            const dirty = !!draft[r.id];
            return (
              <tr key={r.id} className={rowCls(dirty)}>
                <td className="px-2 py-2 text-center text-[11px] tabular-nums text-slate-400">{i + 1}</td>
                <Cell>
                  <TextInput value={valueOf(r, "title") ?? ""}
                    onChange={(e) => edit(r.id, { title: e.target.value })} onBlur={() => commit(r)} />
                </Cell>
                <td className="px-2 py-2 text-center">
                  {r.url
                    ? <a href={r.url} target="_blank" rel="noreferrer"
                        className="text-[#458BC3] hover:underline" title={r.url}>開く</a>
                    : <span className="text-slate-300">—</span>}
                </td>
                <Cell>
                  <Select value={valueOf(r, "channel") ?? ""} options={channels} placeholder="—"
                    onChange={(v) => { edit(r.id, { channel: v }); setTimeout(() => commit(r), 0); }} />
                </Cell>
                <Cell>
                  <TextInput type="date" value={valueOf(r, "publishedAt") ?? ""}
                    onChange={(e) => edit(r.id, { publishedAt: e.target.value })} onBlur={() => commit(r)} />
                </Cell>
                <Ro right>
                  <span className="text-slate-400">
                    {r.daysSincePublish === null ? "—" : `${r.daysSincePublish}日`}
                  </span>
                </Ro>
                <Cell>
                  <NumInput value={valueOf(r, "views") ?? ""}
                    onChange={(e) => edit(r.id, { views: e.target.value === "" ? null : Number(e.target.value) })}
                    onBlur={() => commit(r)} />
                </Cell>
                <Cell>
                  <PctInput value={draft[r.id]?._ctr ?? pctToView(r.thumbCtr)}
                    onChange={(e) => edit(r.id, { _ctr: e.target.value, thumbCtr: pctToStore(e.target.value) })}
                    onBlur={() => commit(r)} />
                </Cell>
                <Cell>
                  <PctInput value={draft[r.id]?._ret ?? pctToView(r.retention)}
                    onChange={(e) => edit(r.id, { _ret: e.target.value, retention: pctToStore(e.target.value) })}
                    onBlur={() => commit(r)} />
                </Cell>
                <Cell>
                  <NumInput value={valueOf(r, "lineAdds") ?? ""}
                    onChange={(e) => edit(r.id, { lineAdds: e.target.value === "" ? null : Number(e.target.value) })}
                    onBlur={() => commit(r)} />
                </Cell>
                <Ro right>
                  <span className={r.cvr && r.cvr >= 0.01 ? "font-bold text-[#DF8D33]" : "font-semibold text-[#2e6a9e]"}>
                    {r.cvr ? `${(r.cvr * 100).toFixed(2)}%` : "—"}
                  </span>
                </Ro>
                <Cell>
                  <TextInput value={valueOf(r, "giveaway") ?? ""} placeholder="概要欄の特典"
                    onChange={(e) => edit(r.id, { giveaway: e.target.value })} onBlur={() => commit(r)} />
                </Cell>
                <td className="px-1 text-center">
                  <button onClick={() => remove(r.id)}
                    className="rounded px-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
                    title="削除">×</button>
                </td>
              </tr>
            );
          })}

          {/* 新規行。並べ替えても常に最後に置く */}
          <tr className="bg-slate-50/70">
            <td />
            <Cell><TextInput value={nw.title} placeholder="＋ 動画タイトル"
              onChange={(e) => setNw({ ...nw, title: e.target.value })} /></Cell>
            <Cell><TextInput value={nw.url} placeholder="https://"
              onChange={(e) => setNw({ ...nw, url: e.target.value })} /></Cell>
            <Cell><Select value={nw.channel} options={channels} placeholder="—"
              onChange={(v) => setNw({ ...nw, channel: v })} /></Cell>
            <Cell><TextInput type="date" value={nw.publishedAt}
              onChange={(e) => setNw({ ...nw, publishedAt: e.target.value })} /></Cell>
            <td />
            <Cell><NumInput value={nw.views}
              onChange={(e) => setNw({ ...nw, views: e.target.value })} /></Cell>
            <Cell><PctInput value={nw.thumbCtr}
              onChange={(e) => setNw({ ...nw, thumbCtr: e.target.value })} /></Cell>
            <Cell><PctInput value={nw.retention}
              onChange={(e) => setNw({ ...nw, retention: e.target.value })} /></Cell>
            <Cell><NumInput value={nw.lineAdds}
              onChange={(e) => setNw({ ...nw, lineAdds: e.target.value })} /></Cell>
            <td />
            <Cell><TextInput value={nw.giveaway} placeholder="概要欄の特典"
              onChange={(e) => setNw({ ...nw, giveaway: e.target.value })} /></Cell>
            <td className="text-center">
              <button onClick={add} disabled={!nw.title}
                className="rounded-md bg-[#458BC3] px-2 py-1 text-[11px] font-bold text-white
                           disabled:bg-slate-200 disabled:text-slate-400">追加</button>
            </td>
          </tr>
        </tbody>
      </TableBox>
    </section>
  );
}

/* ── LINE配信 ── */
const LINE_COLS: Col[] = [
  { key: "title", label: "配信内容", w: "28%" },
  { key: "account", label: "公式LINEアカウント", w: "18%" },
  { key: "genre", label: "ジャンル", w: "11%" },
  { key: "sentAt", label: "配信日", w: "9%" },
  { key: "writer", label: "原稿", w: "8%" },
  { key: "sentCount", label: "配信数", w: "8%", num: true },
  { key: "openRate", label: "開封率", w: "8%", num: true },
  { key: "clickRate", label: "クリック率", w: "8%", num: true },
  { key: "", label: "", w: "3%" },
];

export function LineKpiTable({
  rows, accounts, genres, writers,
}: {
  rows: LineKpi[]; accounts: readonly string[]; genres: readonly string[]; writers: readonly string[];
}) {
  const { save, remove, pending, error } = useSaver("line");
  const [draft, setDraft] = useState<Record<string, any>>({});
  const { sorted, key, dir, toggle } = useSorted(rows, LINE_COLS, "sentAt", "desc");

  const blank = { title: "", account: "", genre: "", sentAt: "", sentCount: "", openRate: "", clickRate: "", writer: "" };
  const [nw, setNw] = useState<Record<string, any>>(blank);

  function edit(id: string, patch: Record<string, unknown>) {
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }
  function valueOf(r: LineKpi, k: keyof LineKpi) {
    const d = draft[r.id];
    return d && k in d ? d[k] : r[k];
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
      <SectionHead
        title="LINE配信" count={rows.length} pending={pending} error={error}
        note="見出しをクリックで並べ替え。開封率・クリック率は % で入力。"
      />
      <TableBox>
        <Thead cols={LINE_COLS} sortKey={key} dir={dir} onSort={toggle} rank />
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.id} className={rowCls(!!draft[r.id])}>
              <td className="px-2 py-2 text-center text-[11px] tabular-nums text-slate-400">{i + 1}</td>
              <Cell>
                <TextInput value={valueOf(r, "title") ?? ""}
                  onChange={(e) => edit(r.id, { title: e.target.value })} onBlur={() => commit(r)} />
              </Cell>
              <Cell>
                <Select value={valueOf(r, "account") ?? ""} options={accounts} placeholder="—"
                  onChange={(v) => { edit(r.id, { account: v }); setTimeout(() => commit(r), 0); }} />
              </Cell>
              <Cell>
                <Select value={valueOf(r, "genre") ?? ""} options={genres} placeholder="—"
                  onChange={(v) => { edit(r.id, { genre: v }); setTimeout(() => commit(r), 0); }} />
              </Cell>
              <Cell>
                <TextInput type="date" value={valueOf(r, "sentAt") ?? ""}
                  onChange={(e) => edit(r.id, { sentAt: e.target.value })} onBlur={() => commit(r)} />
              </Cell>
              <Cell>
                <Select value={valueOf(r, "writer") ?? ""} options={writers} placeholder="—"
                  onChange={(v) => { edit(r.id, { writer: v }); setTimeout(() => commit(r), 0); }} />
              </Cell>
              <Cell>
                <NumInput value={valueOf(r, "sentCount") ?? ""}
                  onChange={(e) => edit(r.id, { sentCount: e.target.value === "" ? null : Number(e.target.value) })}
                  onBlur={() => commit(r)} />
              </Cell>
              <Cell>
                <PctInput value={draft[r.id]?._open ?? pctToView(r.openRate)}
                  onChange={(e) => edit(r.id, { _open: e.target.value, openRate: pctToStore(e.target.value) })}
                  onBlur={() => commit(r)} />
              </Cell>
              <Cell>
                <PctInput value={draft[r.id]?._click ?? pctToView(r.clickRate)}
                  onChange={(e) => edit(r.id, { _click: e.target.value, clickRate: pctToStore(e.target.value) })}
                  onBlur={() => commit(r)} />
              </Cell>
              <td className="px-1 text-center">
                <button onClick={() => remove(r.id)}
                  className="rounded px-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
                  title="削除">×</button>
              </td>
            </tr>
          ))}

          <tr className="bg-slate-50/70">
            <td />
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
            <td className="text-center">
              <button onClick={add} disabled={!nw.title}
                className="rounded-md bg-[#458BC3] px-2 py-1 text-[11px] font-bold text-white
                           disabled:bg-slate-200 disabled:text-slate-400">追加</button>
            </td>
          </tr>
        </tbody>
      </TableBox>
    </section>
  );
}
