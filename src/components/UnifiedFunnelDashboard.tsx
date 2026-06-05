import { yen } from "@/lib/format";
import type { UnifiedSummary } from "@/lib/marketing";
import Link from "next/link";
import UtageSyncButton from "./UtageSyncButton";

interface Props {
  summary: UnifiedSummary;
  fromYM: string;
  toYM: string;
  seitoSuLatest: number;
}

const CAT_COLOR: Record<string, { bg: string; bar: string; text: string }> = {
  "メタ広告":         { bg: "bg-blue-50",    bar: "fill-blue-500",    text: "text-blue-700" },
  "YouTube自然流入": { bg: "bg-red-50",     bar: "fill-red-500",     text: "text-red-700" },
  "公式LINE":         { bg: "bg-emerald-50", bar: "fill-emerald-500", text: "text-emerald-700" },
  "面談予約":         { bg: "bg-amber-50",   bar: "fill-amber-500",   text: "text-amber-700" },
};

const BIZ_COLOR: Record<string, string> = {
  "白谷塾オンライン": "bg-blue-100 text-blue-800 border-blue-300",
  "ローカルメディ":   "bg-emerald-100 text-emerald-800 border-emerald-300",
  "宮崎教室":         "bg-amber-100 text-amber-800 border-amber-300",
  "未分類":           "bg-slate-100 text-slate-600 border-slate-300",
};

function pct(n: number, d: number): string {
  if (d === 0) return "—";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function dayDiff(fromYM: string, toYM: string): number {
  // 期間内の日数（おおよそ）
  const [fy, fm] = fromYM.split("-").map(Number);
  const [ty, tm] = toYM.split("-").map(Number);
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1) * 30;
}

export default function UnifiedFunnelDashboard({ summary, fromYM, toYM, seitoSuLatest }: Props) {
  const { totals, byBusiness } = summary;
  const periodDays = dayDiff(fromYM, toYM);

  // ----- 経路カテゴリ別合計 -----
  const catBars = [
    { label: "メタ広告",         value: totals.metaAdLeads,  color: "メタ広告" },
    { label: "YouTube自然流入", value: totals.youtubeLeads, color: "YouTube自然流入" },
    { label: "公式LINE",        value: totals.officialLeads, color: "公式LINE" },
  ];

  const cpa = totals.metaAdLeads > 0 ? Math.round(totals.adCost / totals.metaAdLeads) : 0;

  // ファネル各段階（リード→面談→体験→入塾→生徒数）
  // 面談 = UTAGE 面談予約シナリオの登録数（=予約完了が即ち面談確定とみなす）
  const stages = [
    { label: "リード",   value: totals.totalLeads,    color: "blue",    sub: "UTAGE メタ広告 + YouTube" },
    { label: "面談",     value: totals.reservations,  color: "amber",   sub: "UTAGE 面談予約シナリオ登録" },
    { label: "体験",     value: totals.trials,        color: "orange",  sub: "R8面談DB 体験段階" },
    { label: "入塾",     value: totals.enrollments,   color: "emerald", sub: "受講生DB 入塾月" },
    { label: "在籍生徒数", value: seitoSuLatest,       color: "purple",  sub: "直近月 PL" },
  ] as const;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">🎯 マーケティングファネル</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            UTAGE 流入経路マスター × 日次リード数 / 面談・体験生徒DB / 受講生DB / 月次PL 広告費 を統合
          </p>
        </div>
        <UtageSyncButton />
      </div>

      {/* メインファネル: リード → 面談 → 体験 → 入塾 → 生徒数 */}
      <div className="p-4 bg-slate-50">
        <div className="flex items-stretch gap-1">
          {stages.map((s, i) => {
            const prev = i > 0 ? stages[i - 1].value : 0;
            const conv = i > 0 && prev > 0 ? (s.value / prev) * 100 : null;
            return (
              <div key={s.label} className="flex-1 flex items-stretch gap-1">
                <div className={`flex-1 border rounded p-3 bg-white ${stageBorder(s.color)}`}>
                  <div className="text-[10px] text-slate-600 font-medium">{s.label}</div>
                  <div className={`text-2xl font-bold tabular-nums mt-1 ${stageText(s.color)}`}>{s.value.toLocaleString()}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{s.sub}</div>
                </div>
                {i < stages.length - 1 && (
                  <div className="flex flex-col items-center justify-center px-1 min-w-[60px]">
                    <div className="text-[9px] text-slate-500">転換</div>
                    <div className="text-xs font-bold text-emerald-700 tabular-nums">
                      {conv !== null ? `${conv.toFixed(1)}%` : "—"}
                    </div>
                    <div className="text-slate-300 text-lg leading-none">→</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 補助情報: 面談予約 / 広告費 / CPA */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <KpiBox label="面談予約（UTAGE）" value={totals.reservations.toLocaleString()} sub={`Zoom面談予約完了直後 / リードの${pct(totals.reservations, totals.totalLeads)}`} color="amber" />
          <KpiBox label="広告費" value={yen(totals.adCost)} sub="月次PL 期間合計" color="red" />
          <KpiBox label="CPA (メタ広告)" value={cpa > 0 ? yen(cpa) : "—"} sub={`¥${totals.adCost.toLocaleString()} ÷ ${totals.metaAdLeads} 件`} color="purple" />
        </div>
      </div>

      {/* 経路カテゴリ別 比較バー */}
      <div className="px-4 py-3 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 mb-2">📊 経路カテゴリ別 リード数</h3>
        <div className="space-y-1.5">
          {catBars.map((c) => {
            const share = totals.totalLeads > 0 ? (c.value / totals.totalLeads) * 100 : 0;
            const col = CAT_COLOR[c.color];
            return (
              <div key={c.label} className="flex items-center gap-2 text-xs">
                <div className={`w-28 ${col.text} font-medium`}>{c.label}</div>
                <div className="flex-1 bg-slate-100 rounded h-5 overflow-hidden relative">
                  <div className={`h-full ${col.bar.replace("fill", "bg")} transition-all`} style={{ width: `${share}%` }} />
                  <div className="absolute inset-0 flex items-center px-2 text-[11px] font-bold tabular-nums">
                    {c.value.toLocaleString()} <span className="text-slate-500 ml-1.5 font-normal">({share.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-16 text-right tabular-nums text-slate-500">
                  {(c.value / Math.max(1, periodDays / 30)).toFixed(1)}/月
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 事業別カード */}
      <div className="px-4 py-3 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 mb-2">🏢 事業別 内訳</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {Object.entries(byBusiness)
            .filter(([b]) => b !== "未分類")
            .sort((a, b) => b[1].leads - a[1].leads)
            .map(([biz, v]) => {
              const bizCpa = v.leads > 0 ? Math.round(v.adCost / v.leads) : 0;
              return (
                <div key={biz} className={`border rounded p-3 ${BIZ_COLOR[biz] ?? BIZ_COLOR["未分類"]}`}>
                  <div className="text-xs font-bold mb-2">{biz}</div>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[11px]">
                    <div><span className="text-slate-600">リード:</span> <span className="tabular-nums font-bold">{v.leads}</span></div>
                    <div><span className="text-slate-600">面談:</span> <span className="tabular-nums font-bold">{v.consultations}</span></div>
                    <div><span className="text-slate-600">体験:</span> <span className="tabular-nums font-bold">{v.trials}</span></div>
                    <div><span className="text-slate-600">入塾:</span> <span className="tabular-nums font-bold">{v.enrollments}</span></div>
                    <div><span className="text-slate-600">予約:</span> <span className="tabular-nums">{v.reservations}</span></div>
                    <div />
                    <div className="col-span-3 pt-1 border-t border-slate-300/50">
                      <span className="text-slate-600">広告費:</span> <span className="tabular-nums font-bold">{yen(v.adCost)}</span>
                      {bizCpa > 0 && <span className="ml-2 text-slate-500">CPA {yen(bizCpa)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* リード獲得詳細へのリンク */}
      <div className="px-4 py-3 border-t border-slate-200 bg-blue-50">
        <Link href="/leads" className="text-sm text-blue-700 hover:underline font-medium">
          🔍 リード獲得詳細を見る（アカウント別 / シナリオ別 / 日別グラフ） →
        </Link>
      </div>
    </div>
  );
}

function stageBorder(color: "blue" | "amber" | "orange" | "emerald" | "purple"): string {
  return { blue: "border-blue-300", amber: "border-amber-300", orange: "border-orange-300", emerald: "border-emerald-300", purple: "border-purple-300" }[color];
}
function stageText(color: "blue" | "amber" | "orange" | "emerald" | "purple"): string {
  return { blue: "text-blue-700", amber: "text-amber-700", orange: "text-orange-700", emerald: "text-emerald-700", purple: "text-purple-700" }[color];
}

function KpiBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: "blue" | "amber" | "orange" | "emerald" | "red" | "purple" }) {
  const colorMap = {
    blue: "bg-white border-blue-200",
    amber: "bg-white border-amber-200",
    orange: "bg-white border-orange-200",
    emerald: "bg-white border-emerald-200",
    red: "bg-white border-red-200",
    purple: "bg-white border-purple-200",
  };
  const valueColor = {
    blue: "text-blue-700",
    amber: "text-amber-700",
    orange: "text-orange-700",
    emerald: "text-emerald-700",
    red: "text-red-700",
    purple: "text-purple-700",
  };
  return (
    <div className={`border rounded p-2.5 ${colorMap[color]}`}>
      <div className="text-[10px] text-slate-600 font-medium">{label}</div>
      <div className={`text-xl font-bold tabular-nums mt-0.5 ${valueColor[color]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
