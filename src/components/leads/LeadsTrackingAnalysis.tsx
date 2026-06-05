export interface TrackingRow {
  name: string;
  count: number;
  type: string;
}

export interface ScenarioTracking {
  account_id: string;
  scenario_id: string;
  account_name: string;
  scenario_name: string;
  category: string;
  total: number;
  trackings: TrackingRow[];
}

interface Props {
  scenarios: ScenarioTracking[];
}

const TYPE_COLOR: Record<string, { bg: string; bar: string; text: string }> = {
  "YouTube":     { bg: "bg-red-50",     bar: "bg-red-500",     text: "text-red-700" },
  "他LINE誘導":  { bg: "bg-emerald-50", bar: "bg-emerald-500", text: "text-emerald-700" },
  "SNS投稿":     { bg: "bg-purple-50",  bar: "bg-purple-500",  text: "text-purple-700" },
  "メタ広告":    { bg: "bg-blue-50",    bar: "bg-[#458BC3]",    text: "text-[#458BC3]" },
  "不明":        { bg: "bg-slate-50",   bar: "bg-slate-400",   text: "text-slate-500" },
};

export default function LeadsTrackingAnalysis({ scenarios }: Props) {
  if (scenarios.length === 0) return null;

  return (
    <section className="bg-white border border-slate-200 rounded">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-bold">🔍 流入元 詳細分析（message_tracking_name）</h2>
        <p className="text-[10px] text-slate-500 mt-0.5">登録直前にユーザーが見ていた動画 / LINE / 投稿の内訳。流入が多い順</p>
      </div>

      <div className="divide-y divide-slate-200">
        {scenarios.map((s) => {
          // type別合計
          const byType: Record<string, number> = {};
          for (const t of s.trackings) byType[t.type] = (byType[t.type] ?? 0) + t.count;
          const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);

          return (
            <div key={`${s.account_id}|${s.scenario_id}`} className="p-4">
              {/* シナリオヘッダー */}
              <div className="mb-3">
                <div className="text-xs text-slate-500">{s.account_name}</div>
                <div className="text-sm font-bold">{s.scenario_name}</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  累計登録 <span className="font-bold tabular-nums">{s.total}</span>件
                  <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px]">{s.category}</span>
                </div>
              </div>

              {/* タイプ別 サマリ */}
              <div className="mb-3 flex gap-1.5 flex-wrap">
                {sortedTypes.map(([type, count]) => {
                  const col = TYPE_COLOR[type] ?? TYPE_COLOR["不明"];
                  const pct = (count / s.total) * 100;
                  return (
                    <div key={type} className={`px-2 py-1 rounded border ${col.bg} ${col.text} text-[11px]`}>
                      <span className="font-bold">{type}</span>
                      <span className="ml-1 tabular-nums font-bold">{count}</span>
                      <span className="ml-1 opacity-70">({pct.toFixed(0)}%)</span>
                    </div>
                  );
                })}
              </div>

              {/* 流入元 ランキング */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] text-slate-500 border-b border-slate-100">
                    <th className="px-1 py-1 font-medium">#</th>
                    <th className="px-1 py-1 font-medium">流入元</th>
                    <th className="px-1 py-1 font-medium">種別</th>
                    <th className="px-1 py-1 font-medium text-right">件数</th>
                    <th className="px-1 py-1 font-medium text-right">シェア</th>
                    <th className="px-2 py-1 font-medium" style={{ width: "40%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {s.trackings.map((t, i) => {
                    const pct = (t.count / s.total) * 100;
                    const col = TYPE_COLOR[t.type] ?? TYPE_COLOR["不明"];
                    return (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-1 py-1.5 text-slate-400 tabular-nums">{i + 1}</td>
                        <td className="px-1 py-1.5 max-w-md">
                          <div className="truncate" title={t.name}>{t.name}</div>
                        </td>
                        <td className="px-1 py-1.5">
                          <span className={`text-[10px] font-medium ${col.text}`}>{t.type}</span>
                        </td>
                        <td className="px-1 py-1.5 text-right tabular-nums font-bold">{t.count}</td>
                        <td className="px-1 py-1.5 text-right tabular-nums text-slate-500">{pct.toFixed(1)}%</td>
                        <td className="px-2 py-1.5">
                          <div className="bg-slate-100 h-2 rounded overflow-hidden">
                            <div className={`h-full ${col.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500">
        💡 「他LINE誘導」「YouTube」「SNS投稿」の比率を見ることで、どの集客チャネルが効いているか把握できる
      </div>
    </section>
  );
}
