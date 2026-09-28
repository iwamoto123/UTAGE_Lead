import { yen } from "@/lib/format";
import type { SalesGroup } from "@/lib/utage-sales";

/* 短期プログラム・企画の売上。UTAGEの決済がそのまま出るので、月次PLより先に数字が見える。 */
export default function ShortProgramSales({
  groups, total,
}: { groups: SalesGroup[]; total: { amount: number; count: number } }) {
  if (groups.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-bold">🎯 短期プログラム・企画の売上</h2>
        <div className="text-sm text-slate-600">
          {yen(total.amount)} ／ {total.count}件
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="text-left px-3 py-2 font-bold">企画</th>
              <th className="text-left px-3 py-2 font-bold w-40">期間</th>
              <th className="text-right px-3 py-2 font-bold w-28">売上</th>
              <th className="text-right px-3 py-2 font-bold w-20">人数</th>
              <th className="text-left px-3 py-2 font-bold">申込者</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.name} className="border-t border-slate-200 align-top">
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                  {g.firstDate.slice(5)}〜{g.lastDate.slice(5)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{yen(g.amount)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{g.count}件</td>
                <td className="px-3 py-2 text-slate-600 leading-relaxed">
                  {g.buyers.length ? g.buyers.join("・") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        申込者はUTAGEの決済者シナリオに入っている表示名です。毎朝8:25の同期で更新されます。
      </p>
    </div>
  );
}
