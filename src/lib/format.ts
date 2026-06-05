export function yen(n: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);
}

export function manen(n: number): string {
  const m = Math.round(n / 10000);
  return `${m.toLocaleString("ja-JP")}万円`;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function yearMonthJP(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}
