import { pool } from './db.js';

export type CreateTradeImportInput = {
  userId: string;
  fileName: string;
  source?: string;
  columns: string[];
  warnings: string[];
};

export type TradeImportRecord = {
  id: string;
  user_id: string;
  file_name: string;
  source: string;
  created_at: string;
  columns: string[];
  warnings: string[];
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
};

export async function createTradeImport(
  input: CreateTradeImportInput,
): Promise<TradeImportRecord> {
  const result = await pool.query<TradeImportRecord>(
    `
      insert into public.trade_imports (
        user_id,
        file_name,
        source,
        columns,
        warnings
      )
      values ($1, $2, $3, $4::jsonb, $5::jsonb)
      returning *
    `,
    [
      input.userId,
      input.fileName,
      input.source ?? 'csv',
      JSON.stringify(input.columns),
      JSON.stringify(input.warnings),
    ],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to create trade import');
  }

  return row;
}

export async function getTradeImportById(
  importId: string,
  userId: string,
): Promise<TradeImportRecord | null> {
  const result = await pool.query<TradeImportRecord>(
    `
      select *
      from public.trade_imports
      where id = $1
        and user_id = $2
      limit 1
    `,
    [importId, userId],
  );

  return result.rows[0] ?? null;
}

export async function listTradeImportsForUser(
  userId: string,
): Promise<TradeImportRecord[]> {
  const result = await pool.query<TradeImportRecord>(
    `
      select *
      from public.trade_imports
      where user_id = $1
      order by created_at desc
    `,
    [userId],
  );

  return result.rows;
}

export type UpdateTradeImportStatusInput = {
  importId: string;
  userId: string;
  status: 'pending' | 'validated' | 'imported' | 'failed';
  totalRows: number;
  validRows: number;
  invalidRows: number;
};

export async function updateTradeImportStatus(
  input: UpdateTradeImportStatusInput,
): Promise<void> {
  await pool.query(
    `
      update public.trade_imports
      set
        status = $3,
        total_rows = $4,
        valid_rows = $5,
        invalid_rows = $6
      where id = $1
        and user_id = $2
    `,
    [
      input.importId,
      input.userId,
      input.status,
      input.totalRows,
      input.validRows,
      input.invalidRows,
    ],
  );
}