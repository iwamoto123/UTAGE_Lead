import type { FunnelSummary } from "@/lib/marketing";
import UtageSyncButton from "./UtageSyncButton";

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "−";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

interface Props {
  summary: FunnelSummary;
  seitoSuLatest: number;
  utage?: { metaAd: number; youtube: number; officialLine: number; meetingReservation: number };
}

export default function FunnelKpi({ summary, seitoSuLatest, utage }: Props) {
  const { leadCount, consultationCount, trialCount, enrollmentCount } = summary;

  const stages = [
    { label: "リード", subLabel: "LINE登録", value: leadCount, conv: null, color: "bg-slate-100 border-slate-300" },
    { label: "面談", subLabel: "予約→実施", value: consultationCount, conv: pct(consultationCount, leadCount), color: "bg-blue-100 border-blue-300" },
    { label: "体験", subLabel: "面談→体験開始", value: trialCount, conv: pct(trialCount, consultationCount), color: "bg-amber-100 border-amber-300" },
    { label: "入塾", subLabel: "体験→入塾確定", value: enrollmentCount, conv: pct(enrollmentCount, trialCount), color: "bg-emerald-100 border-emerald-300" },
    { label: "在籍", subLabel: "直近月生徒数", value: seitoSuLatest, conv: null, color: "bg-purple-100 border-purple-300" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded p-4">
      <h2 className="text-lg font-bold mb-3">🎯 マーケティングファネル（期間内）</h2>
      <div className="grid grid-cols-5 gap-2">
        {stages.map((s, i) => (
          <div key={s.label} className={`rounded border ${s.color} p-3 text-center relative`}>
            <div className="text-xs text-slate-600 mb-1">{s.label}</div>
            <div className="text-2xl font-bold tabular-nums">{s.value.toLocaleString("ja-JP")}</div>
            <div className="text-[10px] text-slate-500 mt-1">{s.subLabel}</div>
            {s.conv && (
              <div className="text-[10px] text-emerald-700 mt-1 font-medium">
                ←転換 {s.conv}
              </div>
            )}
            {i < stages.length - 1 && (
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 text-slate-400 text-lg z-10 pointer-events-none">→</div>
            )}
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
        <p>リード = 週次広告レポートのLINE登録者数合計 / 面談 = R8面談・体験生徒DBの「最終面談日」が期間内のレコード数</p>
        <p>体験 = 面談者のうち「ステータス=体験中/塾生/元塾生」or 結果が体験段階に達した人 / 入塾 = 受講生DBの「入塾月」が期間内の人</p>
        <p className="text-amber-700">※ リード／面談はR8（2026年1月）以降のデータのみ集計</p>
      </div>

      {utage && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700">📡 UTAGE経由の経路別リード（期間内）</h3>
            <UtageSyncButton />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
              <div className="text-[10px] text-slate-600">メタ広告</div>
              <div className="text-lg font-bold tabular-nums">{utage.metaAd.toLocaleString("ja-JP")}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
              <div className="text-[10px] text-slate-600">YouTube自然流入</div>
              <div className="text-lg font-bold tabular-nums">{utage.youtube.toLocaleString("ja-JP")}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
              <div className="text-[10px] text-slate-600">公式LINE</div>
              <div className="text-lg font-bold tabular-nums">{utage.officialLine.toLocaleString("ja-JP")}</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded p-2 text-center">
              <div className="text-[10px] text-slate-600">面談予約完了</div>
              <div className="text-lg font-bold tabular-nums">{utage.meetingReservation.toLocaleString("ja-JP")}</div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            UTAGE 流入経路マスター × 日次リード数 DB から集計。シナリオ単位で経路カテゴリを判別。
          </p>
        </div>
      )}
    </div>
  );
}
