import { pool } from './db.js';

export type InsertImportErrorInput = {
  importId: string;
  rowNumber: number;
  errorMessage: string;
  rawData?: unknown;
};

export async function insertImportErrors(
  errors: InsertImportErrorInput[],
): Promise<void> {
  if (errors.length === 0) return;

  const client = await pool.connect();

  try {
    await client.query('begin');

    for (const error of errors) {
      await client.query(
        `
          insert into public.import_errors (
            import_id,
            row_number,
            error_message,
            raw_data
          )
          values ($1, $2, $3, $4::jsonb)
        `,
        [
          error.importId,
          error.rowNumber,
          error.errorMessage,
          JSON.stringify(error.rawData ?? null),
        ],
      );
    }

    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}
