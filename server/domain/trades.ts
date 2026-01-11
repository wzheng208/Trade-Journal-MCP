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
