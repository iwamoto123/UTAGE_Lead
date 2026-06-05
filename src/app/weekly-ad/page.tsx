import {
  getWeeklyAdReports,
  getCampaignMaster,
  groupReportsByCampaign,
  partitionByActivity,
  lastWeekMondayYmd,
  sumReports,
} from "@/lib/weekly-ad";
import CampaignWeeklyTable from "@/components/weekly-ad/CampaignWeeklyTable";

export default async function WeeklyAdPage() {
  const [reports, campaigns] = await Promise.all([
    getWeeklyAdReports(),
    getCampaignMaster(),
  ]);
  const grouped = groupReportsByCampaign(reports, campaigns);
  const boundary = lastWeekMondayYmd();
  const { active, ended } = partitionByActivity(grouped, boundary);

  const grandTotal = sumReports(reports);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">週次広告レポート</h1>
          <p className="text-xs text-slate-500">
            稼働中＝今週・先週({boundary}以降)に週次レポート入力あり / 実施済み＝先々週以前で停止
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <Kpi label="累計消化金額" value={`¥${Math.round(grandTotal.spend).toLocaleString()}`} />
          <Kpi label="LINE登録累計" value={grandTotal.lineRegistrations.toLocaleString()} />
          <Kpi label="平均CPA" value={grandTotal.cpa !== null ? `¥${Math.round(grandTotal.cpa).toLocaleString()}` : "—"} />
          <Kpi label="キャンペーン数" value={`${grouped.length}件`} />
        </div>
      </header>

      <Section
        title={`稼働中 ${active.length}件`}
        emphasis
        rows={active}
        emptyMessage="現在稼働中（今週・先週入力あり）のキャンペーンはありません"
      />
      <Section
        title={`実施済み ${ended.length}件`}
        rows={ended}
        emptyMessage="実施済みキャンペーンはありません"
        collapsible
      />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded px-3 py-2 min-w-[100px]">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Section({
  title,
  rows,
  emptyMessage,
  emphasis,
  collapsible,
}: {
  title: string;
  rows: ReturnType<typeof groupReportsByCampaign>;
  emptyMessage: string;
  emphasis?: boolean;
  collapsible?: boolean;
}) {
  const heading = (
    <h2 className={`text-sm font-bold ${emphasis ? "text-[#458BC3]" : "text-slate-700"}`}>
      {title}
    </h2>
  );

  const body = rows.length === 0 ? (
    <div className="text-xs text-slate-400 py-4 text-center bg-white border border-dashed border-slate-200 rounded">
      {emptyMessage}
    </div>
  ) : (
    <div className="space-y-3">
      {rows.map((r) => (
        <CampaignWeeklyTable key={r.campaign.id} row={r} />
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <details className="space-y-2" open={rows.length > 0 && rows.length <= 3}>
        <summary className="cursor-pointer list-none">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">▶</span>
            {heading}
          </div>
        </summary>
        <div className="mt-2">{body}</div>
      </details>
    );
  }

  return (
    <section className="space-y-2">
      {heading}
      {body}
    </section>
  );
}
