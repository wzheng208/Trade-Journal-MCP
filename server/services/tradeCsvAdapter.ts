import type { Trade, Side } from '@trade/shared';
import { toDate, toNumber } from 'server/util/parse.js';

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

export type RowToTradeResult =
  | { success: true; trade: Trade }
  | {
      success: false;
      errorMessage: string;
      rawData: TradeCsvRow;
    };

function normalizeSide(raw: string | undefined): Side | null {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'long') return 'Long';
  if (v === 'short') return 'Short';
  return null;
}

export function rowToTrade(r: TradeCsvRow, idx: number): RowToTradeResult {
  const id = (r.Id ?? '').trim();
  if (!id) {
    return {
      success: false,
      errorMessage: `Row ${idx + 1}: missing Id`,
      rawData: r,
    };
  }

  const symbol = (r.ContractName ?? '').trim();
  if (!symbol) {
    return {
      success: false,
      errorMessage: `Row ${idx + 1}: missing ContractName`,
      rawData: r,
    };
  }

  const enteredAtDate = toDate(r.EnteredAt);
  if (!enteredAtDate) {
    return {
      success: false,
      errorMessage: `Row ${idx + 1}: invalid EnteredAt "${r.EnteredAt}"`,
      rawData: r,
    };
  }

  const qty = toNumber(r.Size);
  if (qty == null) {
    return {
      success: false,
      errorMessage: `Row ${idx + 1}: invalid Size "${r.Size}"`,
      rawData: r,
    };
  }

  const side = normalizeSide(r.Type);
  if (!side) {
    return {
      success: false,
      errorMessage: `Row ${idx + 1}: invalid Type "${r.Type}"`,
      rawData: r,
    };
  }

  const entryPrice = toNumber(r.EntryPrice);
  if (entryPrice == null) {
    return {
      success: false,
      errorMessage: `Row ${idx + 1}: invalid EntryPrice "${r.EntryPrice ?? ''}"`,
      rawData: r,
    };
  }

  const exitedAtDate = r.ExitedAt ? toDate(r.ExitedAt) : null;
  if (r.ExitedAt && !exitedAtDate) {
    return {
      success: false,
      errorMessage: `Row ${idx + 1}: invalid ExitedAt "${r.ExitedAt}"`,
      rawData: r,
    };
  }

  const tradeDay =
    (r.TradeDay ?? '').trim() || enteredAtDate.toISOString().slice(0, 10);

  return {
    success: true,
    trade: {
      id,
      symbol,
      side,
      qty,
      enteredAt: enteredAtDate.toISOString(),
      exitedAt: exitedAtDate ? exitedAtDate.toISOString() : undefined,
      entryPrice,
      exitPrice: toNumber(r.ExitPrice) ?? undefined,
      fees: toNumber(r.Fees) ?? undefined,
      pnl: toNumber(r.PnL) ?? undefined,
      tradeDay,
      tradeDuration: (r.TradeDuration ?? '').trim() || undefined,
      commissions: toNumber(r.Commissions) ?? undefined,
    },
  };
}
