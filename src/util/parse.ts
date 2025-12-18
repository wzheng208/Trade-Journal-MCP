export function toNumber(v: string | undefined): number | undefined {

  if (v == null) return undefined;
  
  const cleaned = v.replace(/[$,%\s,]/g, '');

  if (cleaned.length === 0) return undefined;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function toDate(v: string | undefined): Date | null {

  if (!v) return null;

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
