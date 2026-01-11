import type { Trade, Side } from '@trade/shared';
import { toDate, toNumber } from '../util/parse';

export type TradeCsvRow = {
  Id: string;
  ContractName: string;
  EnteredAt: string;
  ExitedAt?: string;
  EntryPrice?: string;
  ExitPrice?: string;
  Fees?: string;
  PnL?: string;
  Size: string;
  Type: string;
  TradeDay?: string;
  TradeDuration?: string;
  Commissions?: string;
};

function normalizeSide(raw: string | undefined): Side {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'long') return 'Long';
  if (v === 'short') return 'Short';
  return 'Long';
}

export function rowToTrade(
  r: TradeCsvRow,
  idx: number,
  warnings: string[],
): Trade {
  const enteredAtDate = toDate(r.EnteredAt);
  if (!enteredAtDate)
    warnings.push(`Row ${idx + 1}: invalid EnteredAt "${r.EnteredAt}"`);

  const exitedAtDate = r.ExitedAt ? toDate(r.ExitedAt) : null;
  if (r.ExitedAt && !exitedAtDate)
    warnings.push(`Row ${idx + 1}: invalid ExitedAt "${r.ExitedAt}"`);

  const qty = toNumber(r.Size);
  if (qty == null) warnings.push(`Row ${idx + 1}: invalid Size "${r.Size}"`);

  const symbol = (r.ContractName ?? '').trim();
  if (!symbol) warnings.push(`Row ${idx + 1}: missing ContractName`);

  const enteredAtIso = enteredAtDate
    ? enteredAtDate.toISOString()
    : new Date(0).toISOString();

  const exitedAtIso = exitedAtDate ? exitedAtDate.toISOString() : undefined;

  const tradeDay =
    (r.TradeDay ?? '').trim() ||
    (enteredAtDate ? enteredAtIso.slice(0, 10) : undefined);

  return {
    id: (r.Id ?? '').trim() || String(idx + 1),

    symbol,
    side: normalizeSide(r.Type),
    qty: qty ?? 0,

    // ✅ ISO strings (shared schema expects this)
    enteredAt: enteredAtIso,
    exitedAt: exitedAtIso,

    entryPrice: toNumber(r.EntryPrice),
    exitPrice: toNumber(r.ExitPrice),

    fees: toNumber(r.Fees),
    pnl: toNumber(r.PnL),

    tradeDay,
    tradeDuration: (r.TradeDuration ?? '').trim() || undefined,

    commissions: toNumber(r.Commissions),
  };
}
