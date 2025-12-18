import type { Trade, Side } from '../domain/trades.js';
import { toDate, toNumber } from '../util/parse.js';

export type TradeCsvRow = {
  Id: string;
  ContractName: string;
  EnteredAt: string;
  ExitedAt: string;
  EntryPrice: string;
  ExitPrice: string;
  Fees: string;
  PnL: string;
  Size: string;
  Type: string;
  TradeDay: string;
  TradeDuration: string;
  Commissions?: string;
};

function normalizeSide(raw: string | undefined): Side {

  const v = (raw ?? '').trim().toUpperCase();
  if (v === 'Long') return 'Long';
  if (v === 'Short') return 'Short';

  return 'Long';
}

export function rowToTrade(
  r: TradeCsvRow,
  idx: number,
  warnings: string[],
): Trade {
  
  const enteredAt = toDate(r.EnteredAt);
  if (!enteredAt)
    warnings.push(`Row ${idx + 1}: invalid EnteredAt "${r.EnteredAt}"`);

  const exitedAt = toDate(r.ExitedAt);
  if (r.ExitedAt && !exitedAt)
    warnings.push(`Row ${idx + 1}: invalid ExitedAt "${r.ExitedAt}"`);

  const qty = toNumber(r.Size);
  if (qty == null) warnings.push(`Row ${idx + 1}: invalid Size "${r.Size}"`);

  const symbol = (r.ContractName ?? '').trim();
  if (!symbol) warnings.push(`Row ${idx + 1}: missing ContractName`);

  return {
    id: (r.Id ?? '').trim() || String(idx + 1),

    symbol,
    side: normalizeSide(r.Type),
    qty: qty ?? 0,

    enteredAt: enteredAt ?? new Date(0),
    exitedAt: exitedAt ?? undefined,

    entryPrice: toNumber(r.EntryPrice),
    exitPrice: toNumber(r.ExitPrice),

    fees: toNumber(r.Fees),
    pnl: toNumber(r.PnL),

    tradeDay: (r.TradeDay ?? '').trim() || undefined,
    tradeDuration: (r.TradeDuration ?? '').trim() || undefined,

    commissions: toNumber(r.Commissions),
  };
}
