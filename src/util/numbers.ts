export function round(n: number, digits = 2): number {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

export function safeSum(values: Array<number | undefined>): number {
  let total = 0;
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) total += v;
  }
  return total;
}

export function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const i = (sortedAsc.length - 1) * p;
  const low = Math.floor(i);
  const high = Math.ceil(i);
  if (low === high) return sortedAsc[low]!;
  const w = i - low;
  return sortedAsc[low]! * (1 - w) + sortedAsc[high]! * w;
}

export function safeNum(v: number | undefined): number {
  return Number.isFinite(v ?? NaN) ? (v as number) : 0;
}
