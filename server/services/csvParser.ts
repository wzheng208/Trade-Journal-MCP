import { parse } from 'csv-parse/sync';

export function parseCsvText(csvText: string): {
  columns: string[];
  records: Record<string, string>[];
} {
  
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const columns = records.length ? Object.keys(records[0]!) : [];
  return { columns, records };
}
