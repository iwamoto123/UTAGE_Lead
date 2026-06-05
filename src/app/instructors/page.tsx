import baitoData from "@/data/baito.json";
import { yen, yearMonthJP } from "@/lib/format";

interface BaitoRecord {
  name: string;
  ym: string;
  business: string;
  total: number;
  online: number;
  genchi: number;
  students: number;
  allDone: boolean;
  hasIncomplete: boolean;
  breakdownText: string;
}

interface BusinessMonth {
  business: string;
  ym: string;
  total: number;
}

const records = baitoData.records as BaitoRecord[];
const businessMonth = baitoData.businessMonth as BusinessMonth[];

const BUSINESS_ORDER = ["白谷塾オンライン", "ローカルメディ", "宮崎教室"] as const;
const BUSINESS_COLOR: Record<string, string> = {
  白谷塾オンライン: "bg-blue-50 text-blue-700 border-blue-200",
  ローカルメディ: "bg-emerald-50 text-emerald-700 border-emerald-200",
  宮崎教室: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function InstructorsPage() {
  // 講師リスト
  const instructorMap = new Map<string, { name: string; business: string }>();
  for (const r of records) {
    if (!instructorMap.has(r.name)) instructorMap.set(r.name, { name: r.name, business: r.business });
  }
  const instructors = Array.from(instructorMap.values()).sort((a, b) => {
    const oa = BUSINESS_ORDER.indexOf(a.business as typeof BUSINESS_ORDER[number]);
    const ob = BUSINESS_ORDER.indexOf(b.business as typeof BUSINESS_ORDER[number]);
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name, "ja");
  });

  // 月リスト
  const monthSet = new Set<string>();
  records.forEach((r) => monthSet.add(r.ym));
  const months = Array.from(monthSet).sort();

  // 講師×月 マップ
  const recMap = new Map<string, BaitoRecord>();
  for (const r of records) recMap.set(`${r.name}|${r.ym}`, r);

  // 講師ごとの総額
  const instrTotal = new Map<string, { total: number; online: number; genchi: number; students: number }>();
  for (const r of records) {
    const t = instrTotal.get(r.name) ?? { total: 0, online: 0, genchi: 0, students: 0 };
    t.total += r.total;
    t.online += r.online;
    t.genchi += r.genchi;
    t.students = Math.max(t.students, r.students);
    instrTotal.set(r.name, t);
  }

  // 事業別 月次合計
  const bizMonthMap = new Map<string, number>();
  for (const b of businessMonth) bizMonthMap.set(`${b.business}|${b.ym}`, b.total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">👥 講師別バイト代（月次）</h1>
        <p className="text-xs text-slate-500 mt-1">
          CSV「バイト生 武士道 振込」（2025年5月〜2026年4月）を講師×月で集計。現地分は宮崎教室、オンライン分は講師所属事業（白谷塾オンライン／ローカルメディ）に按分。
        </p>
      </div>

      {/* 事業別 月次合計テーブル */}
      <section className="bg-white border border-slate-200 rounded p-4">
        <h2 className="font-bold text-sm mb-3">📊 事業別 バイト代合計（月次）</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-2 px-2 font-medium">事業</th>
                {months.map((m) => (
                  <th key={m} className="text-right py-2 px-2 font-medium whitespace-nowrap">{yearMonthJP(m)}</th>
                ))}
                <th className="text-right py-2 px-2 font-medium bg-slate-100">合計</th>
              </tr>
            </thead>
            <tbody>
              {BUSINESS_ORDER.map((biz) => {
                const total = months.reduce((s, m) => s + (bizMonthMap.get(`${biz}|${m}`) ?? 0), 0);
                if (total === 0) return null;
                return (
                  <tr key={biz} className="border-b border-slate-100">
                    <td className="py-2 px-2 font-medium">
                      <span className={`inline-block px-2 py-0.5 rounded border ${BUSINESS_COLOR[biz]}`}>{biz}</span>
                    </td>
                    {months.map((m) => {
                      const v = bizMonthMap.get(`${biz}|${m}`) ?? 0;
                      return (
                        <td key={m} className="py-2 px-2 text-right tabular-nums">
                          {v > 0 ? yen(v) : <span className="text-slate-300">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-right tabular-nums font-bold bg-slate-50">{yen(total)}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-100 font-bold">
                <td className="py-2 px-2">合計</td>
                {months.map((m) => {
                  const v = BUSINESS_ORDER.reduce((s, b) => s + (bizMonthMap.get(`${b}|${m}`) ?? 0), 0);
                  return <td key={m} className="py-2 px-2 text-right tabular-nums">{yen(v)}</td>;
                })}
                <td className="py-2 px-2 text-right tabular-nums">
                  {yen(BUSINESS_ORDER.reduce((s, b) => s + months.reduce((s2, m) => s2 + (bizMonthMap.get(`${b}|${m}`) ?? 0), 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 講師別 月次テーブル */}
      <section className="bg-white border border-slate-200 rounded p-4">
        <h2 className="font-bold text-sm mb-3">👤 講師別 バイト代（月次）</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-2 px-2 font-medium sticky left-0 bg-slate-50">講師</th>
                <th className="text-left py-2 px-2 font-medium">事業</th>
                <th className="text-right py-2 px-2 font-medium">担当生徒</th>
                {months.map((m) => (
                  <th key={m} className="text-right py-2 px-2 font-medium whitespace-nowrap">{yearMonthJP(m)}</th>
                ))}
                <th className="text-right py-2 px-2 font-medium bg-slate-100">期間合計</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((inst) => {
                const t = instrTotal.get(inst.name)!;
                return (
                  <tr key={inst.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 font-medium whitespace-nowrap sticky left-0 bg-white">{inst.name}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${BUSINESS_COLOR[inst.business] ?? ""}`}>
                        {inst.business}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">{t.students > 0 ? `${t.students}人` : "—"}</td>
                    {months.map((m) => {
                      const r = recMap.get(`${inst.name}|${m}`);
                      if (!r) return <td key={m} className="py-2 px-2 text-right text-slate-300">—</td>;
                      return (
                        <td key={m} className="py-2 px-2 text-right tabular-nums" title={r.breakdownText}>
                          <div>{yen(r.total)}</div>
                          {(r.online > 0 && r.genchi > 0) && (
                            <div className="text-[9px] text-slate-400">
                              オン{yen(r.online).replace("¥", "")}/現{yen(r.genchi).replace("¥", "")}
                            </div>
                          )}
                          {r.hasIncomplete && <div className="text-[9px] text-amber-600">未確定</div>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-right tabular-nums font-bold bg-slate-50">{yen(t.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          「未確定」は、フォームの完了フラグが未マークの行を含むことを示します（2026年3月分など）。集計には含まれます。
        </p>
      </section>

      {/* 講師×月 内訳ドリルダウン */}
      <section className="bg-white border border-slate-200 rounded p-4">
        <h2 className="font-bold text-sm mb-3">📋 内訳テキスト（各講師×各月）</h2>
        <div className="space-y-3">
          {instructors.map((inst) => {
            const myRecords = records.filter((r) => r.name === inst.name).sort((a, b) => a.ym.localeCompare(b.ym));
            if (myRecords.length === 0) return null;
            return (
              <details key={inst.name} className="border border-slate-200 rounded">
                <summary className="px-3 py-2 cursor-pointer hover:bg-slate-50 text-xs font-medium">
                  {inst.name}
                  <span className={`ml-2 inline-block px-2 py-0.5 rounded border text-[10px] ${BUSINESS_COLOR[inst.business] ?? ""}`}>
                    {inst.business}
                  </span>
                  <span className="ml-2 text-slate-500">{myRecords.length}ヶ月 / {yen(instrTotal.get(inst.name)!.total)}</span>
                </summary>
                <div className="border-t border-slate-200 px-3 py-2 space-y-2 text-xs">
                  {myRecords.map((r) => (
                    <div key={r.ym} className="border-b border-slate-100 pb-2 last:border-b-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{yearMonthJP(r.ym)}</span>
                        <span className="tabular-nums">{yen(r.total)}（担当{r.students}人）</span>
                      </div>
                      <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 p-2 rounded">{r.breakdownText}</pre>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
