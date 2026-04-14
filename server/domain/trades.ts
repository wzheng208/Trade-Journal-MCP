export type Side = 'Long' | 'Short';

export type Trade = {
  id: string;

  symbol: string;
  side: Side;
  qty: number;

  enteredAt: Date;
  exitedAt?: Date;

  entryPrice?: number;
  exitPrice?: number;

  fees?: number;
  pnl?: number;

  tradeDay?: string;
  tradeDuration?: string;

  commissions?: number;
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

export function mapTradeRecordToTrade(row: TradeRecord): Trade {
  return {
    id: row.external_id ?? row.id,
    symbol: row.symbol,
    side: row.side as Side,
    qty: row.size,
    enteredAt: new Date(row.entered_at),
    exitedAt: row.exited_at ? new Date(row.exited_at) : undefined,
    entryPrice: Number(row.entry_price),
    exitPrice: row.exit_price !== null ? Number(row.exit_price) : undefined,
    fees: Number(row.fees),
    pnl: row.pnl !== null ? Number(row.pnl) : undefined,
  };
}
