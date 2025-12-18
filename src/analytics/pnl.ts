import type { Trade } from '../domain/trades.js';
import { round, safeNum } from '../util/numbers.js';

export type GroupByKey = 'symbol' | 'side' | 'tradeDay';

export type PnlStats = {
  count: number;
  wins: number;
  losses: number;
  breakeven: number;

  pnl: number;
  fees: number;
  netAfterFees: number;
  avgPnl: number;

  winRate: number; //percent
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  profitFactor: number | null;
};

export function computePnlStats(trades: Trade[]): PnlStats {
  const pnls = trades.map((t) => safeNum(t.pnl));
  const fees = trades.map((t) => safeNum(t.fees));

  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const totalFees = fees.reduce((a, b) => a + b, 0);

  const wins = trades.filter((t) => safeNum(t.pnl) > 0);
  const losses = trades.filter((t) => safeNum(t.pnl) < 0);

  const winCount = wins.length;
  const lossCount = losses.length;
  const totalCount = trades.length;

  const avgPnl = totalCount ? totalPnl / totalCount : 0;

  const avgWin = winCount
    ? wins.map((t) => safeNum(t.pnl)).reduce((a, b) => a + b, 0) / winCount
    : 0;

  const avgLossAbs = lossCount
    ? Math.abs(
        losses.map((t) => safeNum(t.pnl)).reduce((a, b) => a + b, 0) /
          lossCount,
      )
    : 0;

  const winRate = totalCount ? winCount / totalCount : 0;

  const grossProfit = wins
    .map((t) => safeNum(t.pnl))
    .reduce((a, b) => a + b, 0);
    
  const grossLossAbs = Math.abs(
    losses.map((t) => safeNum(t.pnl)).reduce((a, b) => a + b, 0),
  );

  const profitFactor = grossLossAbs > 0 ? grossProfit / grossLossAbs : null;

  const expectancy = totalCount
    ? winRate * avgWin - (1 - winRate) * avgLossAbs
    : 0;

  return {
    count: totalCount,
    wins: winCount,
    losses: lossCount,
    breakeven: trades.filter((t) => safeNum(t.pnl) === 0).length,

    pnl: round(totalPnl, 2),
    fees: round(totalFees, 2),
    netAfterFees: round(totalPnl - totalFees, 2),
    avgPnl: round(avgPnl, 2),

    winRate: round(winRate * 100, 2),
    avgWin: round(avgWin, 2),
    avgLoss: round(avgLossAbs, 2),
    expectancy: round(expectancy, 2),
    profitFactor: profitFactor == null ? null : round(profitFactor, 3),
  };
}

export function getGroupKey(trade: Trade, groupBy: GroupByKey): string {
  if (groupBy === 'symbol') return trade.symbol || 'UNKNOWN';
  if (groupBy === 'side') return trade.side || 'UNKNOWN';
  return trade.tradeDay || 'UNKNOWN';
}

export function groupTrades(trades: Trade[], groupBy: GroupByKey) {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = getGroupKey(t, groupBy);
    const arr = map.get(k) ?? [];
    arr.push(t);
    map.set(k, arr);
  }
  return map;
}
