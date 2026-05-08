import { z } from 'zod';
import type { PnlStats } from '@trade/shared';
import type { Trade } from '../domain/trades.js';
import { getTradeImportById } from '../repositories/tradeImportRepository.js';
import {
  getTradesByImportId,
  type TradeRecord,
} from '../repositories/tradeRepository.js';
import { toDateOrNull } from '../util/dates.js';
import { computePnlStats, groupTrades } from '../analytics/pnl.js';

export const analyticsBaseInputSchema = z.object({
  datasetId: z.string().min(1),
  userId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type AnalyticsBaseInput = z.infer<typeof analyticsBaseInputSchema>;

export type AnalyticsFilter = {
  from: string | null;
  to: string | null;
};

export type PerformanceRow = {
  key: string;
} & PnlStats;

export type LargestWinLossRow = {
  id: string;
  symbol: string;
  side: 'Long' | 'Short';
  pnl: number;
  enteredAt: string;
  exitedAt?: string;
} | null;

function mapTradeRecordToTrade(row: TradeRecord): Trade {
  const enteredAt = new Date(row.entered_at);
  const exitedAt = row.exited_at ? new Date(row.exited_at) : undefined;
  return {
    id: row.external_id ?? row.id,
    symbol: row.symbol,
    side: row.side as 'Long' | 'Short',
    qty: row.size,
    enteredAt,
    exitedAt,
    entryPrice: Number(row.entry_price),
    exitPrice: row.exit_price !== null ? Number(row.exit_price) : undefined,
    fees: Number(row.fees),
    pnl: row.pnl !== null ? Number(row.pnl) : undefined,
    tradeDay: enteredAt.toISOString().slice(0, 10),
  };
}

function getFilter(input: AnalyticsBaseInput): {
  fromD: Date | null;
  toD: Date | null;
  filter: AnalyticsFilter;
} {
  const fromD = toDateOrNull(input.from);
  const toD = toDateOrNull(input.to);

  return {
    fromD,
    toD,
    filter: {
      from: fromD ? fromD.toISOString() : null,
      to: toD ? toD.toISOString() : null,
    },
  };
}

function filterTradesByDate(
  trades: Trade[],
  fromD: Date | null,
  toD: Date | null,
): Trade[] {
  let filtered = trades;

  if (fromD) {
    filtered = filtered.filter((t) => t.enteredAt >= fromD);
  }

  if (toD) {
    filtered = filtered.filter((t) => t.enteredAt <= toD);
  }

  return filtered;
}

function sortRows(rows: PerformanceRow[]): PerformanceRow[] {
  return rows.sort(
    (a, b) => b.pnl - a.pnl || b.count - a.count || a.key.localeCompare(b.key),
  );
}

function getWeekdayName(enteredAt: Date): string {
  return enteredAt.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
}

export async function getDatasetTrades(input: AnalyticsBaseInput): Promise<{
  datasetId: string;
  trades: Trade[];
  filter: AnalyticsFilter;
}> {
  const parsed = analyticsBaseInputSchema.parse(input);

  const tradeImport = await getTradeImportById(parsed.datasetId, parsed.userId);

  if (!tradeImport) {
    throw new Error(`No dataset found for datasetId="${parsed.datasetId}".`);
  }

  const tradeRows = await getTradesByImportId(parsed.datasetId, parsed.userId);
  const trades = tradeRows.map(mapTradeRecordToTrade);

  const { fromD, toD, filter } = getFilter(parsed);

  return {
    datasetId: tradeImport.id,
    trades: filterTradesByDate(trades, fromD, toD),
    filter,
  };
}

export async function getWinRate(input: AnalyticsBaseInput): Promise<{
  datasetId: string;
  filter: AnalyticsFilter;
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
}> {
  const { datasetId, trades, filter } = await getDatasetTrades(input);
  const stats = computePnlStats(trades);

  return {
    datasetId,
    filter,
    count: stats.count,
    wins: stats.wins,
    losses: stats.losses,
    breakeven: stats.breakeven,
    winRate: stats.winRate,
  };
}

export async function getPerformanceBySymbol(
  input: AnalyticsBaseInput,
): Promise<{
  datasetId: string;
  filter: AnalyticsFilter;
  rows: PerformanceRow[];
}> {
  const { datasetId, trades, filter } = await getDatasetTrades(input);

  const grouped = groupTrades(trades, 'symbol');

  return {
    datasetId,
    filter,
    rows: sortRows(
      [...grouped.entries()].map(([key, groupedTrades]) => ({
        key,
        ...computePnlStats(groupedTrades),
      })),
    ),
  };
}

export async function getPerformanceBySide(input: AnalyticsBaseInput): Promise<{
  datasetId: string;
  filter: AnalyticsFilter;
  rows: PerformanceRow[];
}> {
  const { datasetId, trades, filter } = await getDatasetTrades(input);

  const grouped = groupTrades(trades, 'side');

  return {
    datasetId,
    filter,
    rows: sortRows(
      [...grouped.entries()].map(([key, groupedTrades]) => ({
        key,
        ...computePnlStats(groupedTrades),
      })),
    ),
  };
}

export async function getPerformanceByDayOfWeek(
  input: AnalyticsBaseInput,
): Promise<{
  datasetId: string;
  filter: AnalyticsFilter;
  rows: PerformanceRow[];
}> {
  const { datasetId, trades, filter } = await getDatasetTrades(input);

  const grouped = new Map<string, Trade[]>();

  for (const trade of trades) {
    const key = getWeekdayName(trade.enteredAt);
    const arr = grouped.get(key) ?? [];
    arr.push(trade);
    grouped.set(key, arr);
  }

  return {
    datasetId,
    filter,
    rows: sortRows(
      [...grouped.entries()].map(([key, groupedTrades]) => ({
        key,
        ...computePnlStats(groupedTrades),
      })),
    ),
  };
}

export async function getLargestWinLoss(input: AnalyticsBaseInput): Promise<{
  datasetId: string;
  filter: AnalyticsFilter;
  largestWin: LargestWinLossRow;
  largestLoss: LargestWinLossRow;
}> {
  const { datasetId, trades, filter } = await getDatasetTrades(input);

  const closedTrades = trades.filter((trade) => trade.pnl !== undefined);

  const largestWin =
    closedTrades.length > 0
      ? [...closedTrades].sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0))[0]
      : null;

  const largestLoss =
    closedTrades.length > 0
      ? [...closedTrades].sort((a, b) => (a.pnl ?? 0) - (b.pnl ?? 0))[0]
      : null;

  return {
    datasetId,
    filter,
    largestWin: largestWin
      ? {
          id: largestWin.id,
          symbol: largestWin.symbol,
          side: largestWin.side,
          pnl: largestWin.pnl ?? 0,
          enteredAt: largestWin.enteredAt.toISOString(),
          exitedAt: largestWin.exitedAt?.toISOString(),
        }
      : null,
    largestLoss: largestLoss
      ? {
          id: largestLoss.id,
          symbol: largestLoss.symbol,
          side: largestLoss.side,
          pnl: largestLoss.pnl ?? 0,
          enteredAt: largestLoss.enteredAt.toISOString(),
          exitedAt: largestLoss.exitedAt?.toISOString(),
        }
      : null,
  };
}
