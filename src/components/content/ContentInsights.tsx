import type { YoutubeKpi } from "@/lib/content-kpi";

/* 表の中身から、その場で計算して出す考察。
   固定文ではなく毎回いまのデータから作るので、行を足すと結論も変わる。 */

function pearson(pairs: [number, number][]): number | null {
  const n = pairs.length;
  if (n < 5) return null;                       // 数が少ないと相関は意味を持たない
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

function strength(r: number): string {
  const a = Math.abs(r);
  if (a < 0.2) return "ほぼ関係なし";
  if (a < 0.4) return r > 0 ? "弱い正の関係" : "弱い負の関係";
  if (a < 0.7) return r > 0 ? "そこそこ正の関係" : "そこそこ負の関係";
  return r > 0 ? "強い正の関係" : "強い負の関係";
}

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n) + "…" : s);
const dur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export default function ContentInsights({ rows }: { rows: YoutubeKpi[] }) {
  const withCvr = rows.filter((r) => r.views && r.views > 0 && r.lineAdds !== null);
  if (withCvr.length < 3) return null;

  const cvrOf = (r: YoutubeKpi) => (r.lineAdds ?? 0) / (r.views ?? 1);

  // 相関
  const corr = [
    { label: "サムネCTR と CVR", r: pearson(withCvr.filter((r) => r.thumbCtr !== null).map((r) => [r.thumbCtr!, cvrOf(r)])) },
    { label: "視聴維持率 と CVR", r: pearson(withCvr.filter((r) => r.retention !== null).map((r) => [r.retention!, cvrOf(r)])) },
    { label: "再生数 と LINE追加数", r: pearson(withCvr.map((r) => [r.views!, r.lineAdds!])) },
    { label: "尺 と 視聴維持率", r: pearson(rows.filter((r) => r.durationSec && r.retention !== null).map((r) => [r.durationSec!, r.retention!])) },
  ].filter((c) => c.r !== null) as { label: string; r: number }[];

  const byCvr = [...withCvr].sort((a, b) => cvrOf(b) - cvrOf(a));
  const best = byCvr[0];
  const totalViews = withCvr.reduce((s, r) => s + (r.views ?? 0), 0);
  const totalAdds = withCvr.reduce((s, r) => s + (r.lineAdds ?? 0), 0);
  const overall = totalViews ? totalAdds / totalViews : 0;

  // 再生数は多いのにLINEにつながっていない動画（母数のあるものだけ）
  const missed = [...withCvr]
    .filter((r) => (r.views ?? 0) >= Math.max(500, totalViews / withCvr.length))
    .sort((a, b) => cvrOf(a) - cvrOf(b))[0];

  // 逆に、再生数は小さいのに転換している動画
  const hidden = byCvr.find((r) => (r.views ?? 0) < totalViews / withCvr.length && cvrOf(r) > overall * 2);

  const zero = withCvr.filter((r) => (r.lineAdds ?? 0) === 0);
  const ctrRows = rows.filter((r) => r.thumbCtr !== null);
  const topCtr = [...ctrRows].sort((a, b) => (b.thumbCtr ?? 0) - (a.thumbCtr ?? 0))[0];
  const retRows = rows.filter((r) => r.retention !== null);
  const topRet = [...retRows].sort((a, b) => (b.retention ?? 0) - (a.retention ?? 0))[0];

  const lines: React.ReactNode[] = [];

  lines.push(
    <>
      全体のCVRは <b>{pct(overall)}</b>（再生 {totalViews.toLocaleString()} に対して LINE追加 {totalAdds.toLocaleString()}）。
      いちばん転換したのは「{short(best.title)}」で <b className="text-[#DF8D33]">{pct(cvrOf(best))}</b>
      （再生 {best.views?.toLocaleString()} → {best.lineAdds}件）。
    </>,
  );

  if (missed && cvrOf(missed) < overall) {
    lines.push(
      <>
        逆に「{short(missed.title)}」は再生 {missed.views?.toLocaleString()} を集めながら LINE追加は {missed.lineAdds}件（{pct(cvrOf(missed))}）。
        <b>集客はできていて、登録の導線で落ちています。</b>概要欄の特典とLINEへの誘導を最初に見直す対象です。
      </>,
    );
  }

  if (hidden) {
    lines.push(
      <>
        「{short(hidden.title)}」は再生 {hidden.views?.toLocaleString()} と小さいのにCVR {pct(cvrOf(hidden))}。
        <b>見た人が登録する率が高いので、この切り口は再生数を伸ばせば効きます。</b>
      </>,
    );
  }

  if (topCtr?.thumbCtr && topRet?.retention) {
    lines.push(
      <>
        サムネCTRの最高は「{short(topCtr.title)}」の {pct1(topCtr.thumbCtr)}、
        視聴維持率の最高は「{short(topRet.title)}」の {pct1(topRet.retention)}。
        {cvrOf(topCtr) < overall && <>ただしCTR最高の動画のCVRは {pct(cvrOf(topCtr))} で全体平均を下回ります。</>}
      </>,
    );
  }

  if (zero.length) {
    lines.push(
      <>
        LINE追加が0件の動画が <b>{zero.length}本 / {withCvr.length}本</b>。
        {zero.length >= withCvr.length / 2
          ? "半分以上が0件なので、動画ごとの出来より、LINEへの導線そのものが機能していない可能性が高いです。"
          : "この0件グループに共通点（チャンネル・特典の有無）がないか確認する価値があります。"}
      </>,
    );
  }

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-bold">AIの考察</h2>
        <p className="text-[11px] text-slate-500">
          いま表に入っている{rows.length}本から自動で計算しています。行を足したり数値を直すと結論も変わります。
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <ul className="space-y-2 text-xs leading-relaxed text-slate-700">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#458BC3]" />
              <span>{l}</span>
            </li>
          ))}
        </ul>

        {corr.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-slate-500">指標どうしの関係</div>
            <div className="flex flex-wrap gap-2">
              {corr.map((c) => (
                <div key={c.label}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px]">
                  <span className="text-slate-500">{c.label}</span>
                  <span className="ml-2 tabular-nums font-bold text-[#2e6a9e]">
                    r = {c.r.toFixed(2)}
                  </span>
                  <span className="ml-1.5 text-slate-500">{strength(c.r)}</span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              r は −1〜1 の相関係数。0に近いほど「その指標を上げてもCVRは動かない」ことを意味します。
              本数が少ないうちは参考程度に見てください（5本未満の指標は出していません）。
            </p>
          </div>
        )}

        {rows.some((r) => r.durationSec) && (
          <p className="text-[11px] text-slate-500">
            尺の中央値は {dur(
              [...rows.filter((r) => r.durationSec).map((r) => r.durationSec!)]
                .sort((a, b) => a - b)[Math.floor(rows.filter((r) => r.durationSec).length / 2)],
            )}。
          </p>
        )}
      </div>
    </section>
  );
}
