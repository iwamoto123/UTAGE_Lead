import { yen, yearMonthJP } from "@/lib/format";
import KpiCard from "@/components/KpiCard";
import { byMonthAndName, type DailySale, type SalesGroup } from "@/lib/utage-sales";

/* 教材売上だけのタブ。白谷塾オンラインの売上ではあるが、
   月謝とは動き方が違うので単体で見られるようにしている。 */
export default function KyozaiSalesView({
  rows, groups,
}: {
  rows: DailySale[];
  groups: SalesGroup[];
}) {
  const total = groups.reduce((s, g) => s + g.amount, 0);
  const count = groups.reduce((s, g) => s + g.count, 0);
  const avg = count ? Math.round(total / count) : 0;
  const grid = byMonthAndName(rows);

  if (rows.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
        この期間の教材売上はありません。数字は毎朝8:25にUTAGEから取り込んでいます。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="教材売上" value={total} color="orange" caption="UTAGEの決済ベース" />
        <KpiCard label="販売件数" value={count} type="count" color="slate" caption="決済の件数" />
        <KpiCard label="1件あたり" value={avg} color="green" caption="売上÷件数" />
        <KpiCard label="商品数" value={groups.length} type="count" color="purple" caption="売れた商品の種類" />
      </div>

      <div>
        <h2 className="text-lg font-bold mb-2">📘 商品別</h2>
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="text-left px-3 py-2 font-bold">商品</th>
                <th className="text-left px-3 py-2 font-bold w-40">期間</th>
                <th className="text-right px-3 py-2 font-bold w-28">売上</th>
                <th className="text-right px-3 py-2 font-bold w-20">件数</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.name} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium">{g.name}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                    {g.firstDate.slice(5)}〜{g.lastDate.slice(5)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(g.amount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.count}件</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-2">📅 月別 × 商品（冊数）</h2>
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="text-left px-3 py-2 font-bold whitespace-nowrap">月</th>
                {grid.names.map((n) => (
                  <th key={n} className="text-right px-3 py-2 font-bold">{n}</th>
                ))}
                <th className="text-right px-3 py-2 font-bold w-20">合計</th>
                <th className="text-right px-3 py-2 font-bold w-28">売上</th>
              </tr>
            </thead>
            <tbody>
              {grid.months.map((ym) => {
                const t = grid.monthTotal(ym);
                return (
                  <tr key={ym} className="border-t border-slate-200">
                    <td className="px-3 py-2 whitespace-nowrap">{yearMonthJP(ym)}</td>
                    {grid.names.map((n) => {
                      const c = grid.cell(ym, n);
                      return (
                        <td key={n} className="px-3 py-2 text-right tabular-nums">
                          {c ? (
                            <>
                              {c.count}冊
                              <span className="text-slate-400 text-xs ml-1">{yen(c.amount)}</span>
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{t.count}冊</td>
                    <td className="px-3 py-2 text-right tabular-nums">{yen(t.amount)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td className="px-3 py-2">合計</td>
                {grid.names.map((n) => (
                  <td key={n} className="px-3 py-2 text-right tabular-nums">{grid.nameTotal(n).count}冊</td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{count}冊</td>
                <td className="px-3 py-2 text-right tabular-nums">{yen(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          冊数はUTAGEの決済件数です。1回の決済で複数冊買われた場合も1件として数えています。
        </p>
      </div>

      <p className="text-xs text-slate-500">
        教材売上は白谷塾オンライン教室の売上です。月次PLの「教材売上」にも同じ金額が入っていて、
        白谷塾オンラインのタブではチェックを外すと売上合計から抜けます。
      </p>
    </div>
  );
}
