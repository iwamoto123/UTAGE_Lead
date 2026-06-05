import { getMonthlyPL } from "@/lib/db";
import { yearMonthJP } from "@/lib/format";
import MissingCellButton from "@/components/MissingCellButton";
import BoardAdSyncButton from "@/components/BoardAdSyncButton";

type Status = "complete" | "partial" | "missing" | "future" | "grace" | "exempt";

interface Cell {
  ym: string;
  business: string;
  exists: boolean;
  status: Status;
  reasons: string[];
}

function judge(record: { uriage: number; kyozaiUriage: number; tankiUriage: number; sonotaUriage: number;
  kokokuhi: number; kokokuhiCard: number; jinkenhiBaito: number; shainKyuyo: number; gyoumuItaku: number;
  datalessExempt: boolean; } | null,
  business: string, ym: string, today: Date): { status: Status; reasons: string[] } {
  const targetYear = parseInt(ym.split("-")[0], 10);
  const targetMonth = parseInt(ym.split("-")[1], 10);
  const dueDate = new Date(targetYear, targetMonth, 5);

  const today1stOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const target1st = new Date(targetYear, targetMonth - 1, 1);
  if (target1st >= today1stOfMonth) return { status: "future", reasons: [] };

  if (!record) {
    if (today >= dueDate) return { status: "missing", reasons: ["レコード未作成"] };
    return { status: "grace", reasons: [] };
  }

  const reasons: string[] = [];
  const uriageTotal = record.uriage + record.kyozaiUriage + record.tankiUriage + record.sonotaUriage;
  const jinkenhiTotal = record.jinkenhiBaito + record.shainKyuyo + record.gyoumuItaku;

  if (uriageTotal === 0 && business !== "ローカルメディ") reasons.push("売上未入力");
  if (jinkenhiTotal === 0 && business !== "ローカルメディ") reasons.push("人件費未入力");
  if (business === "白谷塾オンライン" || business === "ローカルメディ") {
    if (record.kokokuhi === 0 && record.kokokuhiCard === 0) reasons.push("広告費未入力");
    else if (record.kokokuhiCard === 0) reasons.push("カード明細未入力");
  }

  // 1) すべて入っていれば complete（免除フラグの有無関係なく）
  if (reasons.length === 0) return { status: "complete", reasons: [] };

  // 2) 一部入力ありの場合: 免除フラグがあれば exempt（部分データなしを許容）
  //    一部の値が入っているなら、PL集計には反映される
  if (record.datalessExempt) {
    return { status: "exempt", reasons: ["一部データなし（確認済み）", ...reasons] };
  }

  if (today < dueDate) {
    return { status: "grace", reasons };
  } else {
    return { status: "missing", reasons };
  }
}

function genMonths(): string[] {
  // 2025-04 から 今月まで（降順 = 最新月を先頭に）
  const out: string[] = [];
  const now = new Date();
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;
  for (let y = 2025; y <= endY; y++) {
    const mStart = y === 2025 ? 4 : 1;
    const mEnd = y === endY ? endM : 12;
    for (let m = mStart; m <= mEnd; m++) {
      out.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return out.reverse();
}

const BUSINESSES = ["宮崎教室", "白谷塾オンライン", "ローカルメディ"];

const STATUS_STYLE: Record<Status, { bg: string; label: string; tooltipColor: string }> = {
  complete: { bg: "bg-green-100 text-green-800 border-green-300", label: "✓", tooltipColor: "text-green-700" },
  partial: { bg: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "△", tooltipColor: "text-yellow-700" },
  missing: { bg: "bg-red-100 text-red-800 border-red-300", label: "未提出", tooltipColor: "text-red-700" },
  grace: { bg: "bg-slate-100 text-slate-600 border-slate-300", label: "入力中", tooltipColor: "text-slate-700" },
  exempt: { bg: "bg-slate-200 text-slate-600 border-slate-400", label: "データなし", tooltipColor: "text-slate-700" },
  future: { bg: "bg-slate-50 text-slate-300 border-slate-200", label: "−", tooltipColor: "text-slate-400" },
};

export default async function StatusPage() {
  const all = await getMonthlyPL();
  const today = new Date();
  const months = genMonths();

  const cells: Cell[] = [];
  for (const ym of months) {
    for (const biz of BUSINESSES) {
      const recs = all.filter((r) => r.yearMonth === ym && r.business === biz);
      const r = recs[0] ?? null;
      const { status, reasons } = judge(r, biz, ym, today);
      cells.push({ ym, business: biz, exists: !!r, status, reasons });
    }
  }

  const missingCount = cells.filter((c) => c.status === "missing").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">入力状況モニター</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-3 items-center text-sm flex-wrap">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-green-100 border border-green-300"></span>完了</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-slate-100 border border-slate-300"></span>入力中</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-red-100 border border-red-300"></span>未提出</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-slate-200 border border-slate-400"></span>データなし</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-slate-50 border border-slate-200"></span>対象外</span>
          </div>
          <BoardAdSyncButton />
        </div>
      </div>

      <div className={`p-3 rounded border ${
        missingCount > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"
      }`}>
        {missingCount > 0
          ? `⚠ 締切超過の未提出が ${missingCount} 件あります（毎月5日が翌月分の締切）`
          : "✓ 締切超過の未提出はありません"}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded bg-white">
        <table className="text-sm w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-slate-100 z-10">月</th>
              {BUSINESSES.map((b) => (
                <th key={b} className="text-center px-3 py-2 font-semibold whitespace-nowrap">{b}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((ym) => (
              <tr key={ym} className="border-t border-slate-100">
                <td className="px-3 py-1.5 sticky left-0 bg-white z-10 font-medium">{yearMonthJP(ym)}</td>
                {BUSINESSES.map((biz) => {
                  const c = cells.find((c) => c.ym === ym && c.business === biz)!;
                  const s = STATUS_STYLE[c.status];
                  return (
                    <td key={biz} className="px-2 py-1.5 text-center">
                      {c.status === "missing" ? (
                        <MissingCellButton yearMonth={ym} business={biz} />
                      ) : (
                        <div className={`inline-block px-2 py-1 rounded border ${s.bg} text-xs font-medium`} title={c.reasons.join(", ")}>
                          {s.label}
                        </div>
                      )}
                      {c.reasons.length > 0 && c.status !== "future" && (
                        <div className={`text-[10px] mt-0.5 ${s.tooltipColor}`}>
                          {c.reasons.join("、")}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <h2 className="font-bold text-base">📋 毎月提出すべきデータ（締切: 翌月5日）</h2>
        <p className="text-xs text-slate-600">Claude Codeに以下のファイル・データを共有してください。Claudeがパース→Notionに自動登録します。</p>
        <div className="overflow-x-auto">
          <table className="text-sm w-full border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">ファイル/データ</th>
                <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">入手先</th>
                <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">反映先（月次PL）</th>
                <th className="text-left px-3 py-2 font-semibold border-b border-slate-200">対象事業</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2"><code>SAISON_YYMM.csv</code></td>
                <td className="px-3 py-2 text-slate-600">セゾン netアンサー</td>
                <td className="px-3 py-2">広告費（カード明細）、SaaS利用料、通信費、リース料</td>
                <td className="px-3 py-2 text-slate-600">全事業</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2">宮崎口座 記帳CSV</td>
                <td className="px-3 py-2 text-slate-600">宮崎銀行</td>
                <td className="px-3 py-2">月謝売上（M-NET）、業務委託費（総給与振込）、地代家賃、水道光熱費</td>
                <td className="px-3 py-2 text-slate-600">宮崎教室＋全事業</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2">バイト振込シート</td>
                <td className="px-3 py-2 text-slate-600">Google Sheets</td>
                <td className="px-3 py-2">業務委託費・人件費（バイト代）</td>
                <td className="px-3 py-2 text-slate-600">全事業</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2">UTAGE 売上一覧</td>
                <td className="px-3 py-2 text-slate-600">UTAGE管理画面</td>
                <td className="px-3 py-2">教材売上、短期講座売上</td>
                <td className="px-3 py-2 text-slate-600">白谷塾オンライン</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2">YouTube収益（Google入金）</td>
                <td className="px-3 py-2 text-slate-600">口座記帳</td>
                <td className="px-3 py-2">その他売上</td>
                <td className="px-3 py-2 text-slate-600">白谷塾オンライン</td>
              </tr>
              <tr>
                <td className="px-3 py-2">週次広告レポート</td>
                <td className="px-3 py-2 text-slate-600">Meta広告マネージャ</td>
                <td className="px-3 py-2">広告費（ボード集計）— Notion週次広告レポートDBに直接入力</td>
                <td className="px-3 py-2 text-slate-600">オンライン・ローカルメディ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-500 space-y-1">
        <p><strong>判定ロジック</strong>: 対象月の翌月5日を締切とする。それまでは「入力中」、過ぎても何も入っていなければ「未提出」。</p>
        <p><strong>「提出済み」の判定</strong>: 売上 / 人件費 / 広告費 / その他経費のいずれかに値が入っている状態。</p>
      </div>
    </div>
  );
}
