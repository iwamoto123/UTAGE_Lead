import {
  getYoutubeKpi, getLineKpi, checkContentKpiAccess,
  YT_CHANNELS, LINE_ACCOUNTS, LINE_GENRES, LINE_WRITERS,
} from "@/lib/content-kpi";
import { YoutubeKpiTable, LineKpiTable } from "@/components/content/ContentKpiTables";

// データは unstable_cache で保持し、保存時に revalidateTag で無効化する。
// ページ自体は都度描画（常に最新のキャッシュを反映させるため）。
export const dynamic = "force-dynamic";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-[3px] border-[#458BC3] bg-slate-50 px-3 py-1.5">
      <div className="text-base font-bold text-[#2e6a9e] tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

export default async function ContentKpiPage() {
  const [yt, line, missing] = await Promise.all([
    getYoutubeKpi(), getLineKpi(), checkContentKpiAccess(),
  ]);

  const ytAdds = yt.reduce((s, r) => s + (r.lineAdds ?? 0), 0);
  const ytViews = yt.reduce((s, r) => s + (r.views ?? 0), 0);
  const ytCvr = ytViews > 0 ? ytAdds / ytViews : null;
  const ctrRows = yt.filter((r) => r.thumbCtr !== null);
  const avgCtr = ctrRows.length
    ? ctrRows.reduce((s, r) => s + (r.thumbCtr ?? 0), 0) / ctrRows.length
    : null;
  const clickRows = line.filter((r) => r.clickRate !== null);
  const avgClick = clickRows.length
    ? clickRows.reduce((s, r) => s + (r.clickRate ?? 0), 0) / clickRows.length
    : null;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">コンテンツKPI</h1>
          <p className="text-xs text-slate-500">
            動画・LINE配信の実績を入力する。火曜午前にまとめて、その日の会議で見る。
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Kpi label="動画本数" value={`${yt.length}本`} />
          <Kpi label="LINE追加 合計" value={ytAdds.toLocaleString()} />
          <Kpi label="再生数 合計" value={ytViews.toLocaleString()} />
          <Kpi label="CVR（追加÷再生）" value={ytCvr ? `${(ytCvr * 100).toFixed(2)}%` : "—"} />
          <Kpi label="サムネCTR 平均" value={avgCtr ? `${(avgCtr * 100).toFixed(1)}%` : "—"} />
          <Kpi label="LINE クリック率 平均" value={avgClick ? `${(avgClick * 100).toFixed(1)}%` : "—"} />
        </div>
      </header>

      {missing.length > 0 && (
        <div className="border-l-4 border-[#DF8D33] bg-[#fdf6ec] px-4 py-3 text-xs">
          <b className="block mb-1">Notion の共有設定が1回だけ必要です（{missing.join("・")}）</b>
          対象のDBを Notion で開き、右上の <b>•••</b> →「接続」→ <b>PL Dashboard</b> を追加してください。
          親ページ「広告効果測定ダッシュボード」に接続すれば両方まとめて共有されます。
          <div className="mt-1 text-slate-600">
            YouTube KPI: <code>https://www.notion.so/390d14267acc48eeb364f31a6f87dbf6</code><br />
            LINE配信 KPI: <code>https://www.notion.so/c0390742a260448484917c8d1305e951</code>
          </div>
        </div>
      )}

      <YoutubeKpiTable rows={yt} channels={YT_CHANNELS} />
      <LineKpiTable rows={line} accounts={LINE_ACCOUNTS} genres={LINE_GENRES} writers={LINE_WRITERS} />

      <p className="text-[11px] text-slate-500 border-l-[3px] border-[#DF8D33] bg-slate-50 px-3 py-2">
        保存先は Notion の「YouTube KPI」「LINE配信 KPI」DB（広告効果測定ダッシュボード配下）。
        セルを編集してフォーカスを外すと保存され、計測日が自動で今日になる。
        <br />
        再生数・LINE追加数は将来 YouTube Data API / UTAGE から自動取得に置き換える予定。それまでは手入力。
      </p>
    </div>
  );
}
