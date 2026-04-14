import type { Trade } from '@trade/shared';
import { minutesBetween } from 'server/util/dates.js';
import { percentile, round, safeSum } from 'server/util/numbers.js';
import type { DatasetInfoStats } from '@trade/shared';


function getValidDates(ds: Array<Date | undefined>): Date[] {
  return ds.filter(
    (d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()),
  );
}

function getDurationsMinutes(trades: Trade[]): number[] {
  const durations: number[] = [];

  for (const t of trades) {
    if (!t.enteredAt || !t.exitedAt) continue;

    const entered = new Date(t.enteredAt);
    const exited = new Date(t.exitedAt);

    if (Number.isNaN(entered.getTime()) || Number.isNaN(exited.getTime())) {
      continue;
    }

    const m = minutesBetween(entered, exited);
    if (Number.isFinite(m) && m >= 0) {
      durations.push(m);
    }
  }

  return durations;
}


export function computeDatasetInfoStats(trades: Trade[]): DatasetInfoStats {
  const symbols = new Set(trades.map((t) => t.symbol).filter(Boolean));

  const longs = trades.filter((t) => t.side === 'Long').length;
  const shorts = trades.filter((t) => t.side === 'Short').length;

  const totalPnl = safeSum(trades.map((t) => t.pnl));
  const totalFees = safeSum(trades.map((t) => t.fees));

  const openTrades = trades.filter((t) => !t.exitedAt).length;

  const durations = getDurationsMinutes(trades).sort((a, b) => a - b);
  const avgDuration = durations.length
    ? round(durations.reduce((a, b) => a + b, 0) / durations.length, 2)
    : null;

  return {
    symbolsCount: symbols.size,
    symbolsSample: Array.from(symbols).slice(0, 10),

    sideCounts: { LONG: longs, SHORT: shorts },

    totals: {
      pnl: round(totalPnl, 2),
      fees: round(totalFees, 2),
      netAfterFees: round(totalPnl - totalFees, 2),
      openTrades,
    },

    durationsMinutes: {
      count: durations.length,
      avg: avgDuration,
      p50: durations.length ? round(percentile(durations, 0.5) ?? 0, 2) : null,
      p90: durations.length ? round(percentile(durations, 0.9) ?? 0, 2) : null,
      max: durations.length ? round(durations[durations.length - 1]!, 2) : null,
    },
  };
}
