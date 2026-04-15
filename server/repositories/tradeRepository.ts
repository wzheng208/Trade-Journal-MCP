import { pool } from './db.js';

export type InsertTradeInput = {
  importId: string;
  userId: string;
  externalId?: string | null;
  symbol: string;
  enteredAt: string;
  exitedAt?: string | null;
  entryPrice: number;
  exitPrice?: number | null;
  size: number;
  side: string;
  fees?: number | null;
  pnl?: number | null;
  rawData?: unknown;
};

export type TradeRecord = {
  id: string;
  import_id: string;
  user_id: string;
  external_id: string | null;
  symbol: string;
  entered_at: string;
  exited_at: string | null;
  entry_price: string;
  exit_price: string | null;
  size: number;
  side: string;
  fees: string;
  pnl: string | null;
  raw_data: unknown;
  created_at: string;
};

export async function insertTrades(trades: InsertTradeInput[]): Promise<void> {
  if (trades.length === 0) return;

  const client = await pool.connect();

  try {
    await client.query('begin');

    for (const trade of trades) {
      await client.query(
        `
          insert into public.trades (
            import_id,
            user_id,
            external_id,
            symbol,
            entered_at,
            exited_at,
            entry_price,
            exit_price,
            size,
            side,
            fees,
            pnl,
            raw_data
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb
          )
        `,
        [
          trade.importId,
          trade.userId,
          trade.externalId ?? null,
          trade.symbol,
          trade.enteredAt,
          trade.exitedAt ?? null,
          trade.entryPrice,
          trade.exitPrice ?? null,
          trade.size,
          trade.side,
          trade.fees ?? 0,
          trade.pnl ?? null,
          JSON.stringify(trade.rawData ?? null),
        ],
      );
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function listTradesByUserId(userId: string): Promise<TradeRecord[]> {
  const result = await pool.query<TradeRecord>(
    `
      select *
      from public.trades
      where user_id = $1
      order by entered_at asc
    `,
    [userId],
  );

  return result.rows;
}
