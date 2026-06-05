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

const records = baitoData.records as BaitoRecord[];

export default function MiyazakiBaitoBreakdown({ months }: { months: string[] }) {
  // 宮崎教室の現地分のみ
  const miya = records.filter((r) => r.business === "宮崎教室" && months.includes(r.ym));
  if (miya.length === 0) return null;

  // 名前リスト (期間内合計desc)
  const totalByName = new Map<string, number>();
  for (const r of miya) totalByName.set(r.name, (totalByName.get(r.name) ?? 0) + r.total);
  const names = [...totalByName.keys()].sort((a, b) => (totalByName.get(b) ?? 0) - (totalByName.get(a) ?? 0));

  const recMap = new Map<string, BaitoRecord>();
  for (const r of miya) recMap.set(`${r.name}|${r.ym}`, r);

  const grandTotal = miya.reduce((s, r) => s + r.total, 0);

  return (
    <section className="bg-white border border-slate-200 rounded">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-bold">宮崎教室 バイト代 内訳（講師×月）</h2>
        <p className="text-[10px] text-slate-500 mt-0.5">CSV「バイト生 武士道 振込」の現地分。期間合計 {yen(grandTotal)} / {names.length}名</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2 font-medium sticky left-0 bg-slate-50">講師</th>
              {months.map((m) => (
                <th key={m} className="text-right px-3 py-2 font-medium whitespace-nowrap">{yearMonthJP(m)}</th>
              ))}
              <th className="text-right px-3 py-2 font-medium bg-slate-100">合計</th>
            </tr>
          </thead>
          <tbody>
            {names.map((name) => {
              const total = totalByName.get(name) ?? 0;
              return (
                <tr key={name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-medium whitespace-nowrap sticky left-0 bg-white">{name}</td>
                  {months.map((m) => {
                    const r = recMap.get(`${name}|${m}`);
                    if (!r || r.total === 0) {
                      return <td key={m} className="px-3 py-1.5 text-right text-slate-300">—</td>;
                    }
                    return (
                      <td key={m} className="px-3 py-1.5 text-right tabular-nums" title={r.breakdownText}>
                        {yen(r.total)}
                        {r.hasIncomplete && <span className="ml-1 text-[9px] text-amber-600">未確定</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right tabular-nums font-bold bg-slate-50">{yen(total)}</td>
                </tr>
              );
            })}
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
              <td className="px-3 py-2 sticky left-0 bg-slate-100">合計</td>
              {months.map((m) => {
                const s = names.reduce((acc, n) => acc + (recMap.get(`${n}|${m}`)?.total ?? 0), 0);
                return (
                  <td key={m} className="px-3 py-2 text-right tabular-nums">
                    {s === 0 ? <span className="text-slate-300">—</span> : yen(s)}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right tabular-nums">{yen(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500 px-4 py-2 border-t border-slate-100">
        金額にマウスを乗せると業務内訳テキストが表示されます。
      </p>
    </section>
  );
}
