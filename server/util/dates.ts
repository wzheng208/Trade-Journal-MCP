export function minutesBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 1000 / 60;
}

export function minDate(dates: Date[]): Date | null {

  if (dates.length === 0) return null;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

export function maxDate(dates: Date[]): Date | null {

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export function isoOrNull(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export function toDateOrNull(v?: string): Date | null {
  
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
