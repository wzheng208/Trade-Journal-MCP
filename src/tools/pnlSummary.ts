import { z } from 'zod';
import { datasetStore } from '../services/datasetStore.js';
import { toDateOrNull } from '../util/dates.js';
import {
  computePnlStats,
  groupTrades,
  type GroupByKey,
} from '../analytics/pnl.js';

const inputSchema = z.object({
  datasetId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  groupBy: z.enum(['symbol', 'side', 'tradeDay']).optional(),
  topN: z.number().int().positive().max(50).optional(),
});

export async function pnlSummaryTool(args: unknown) {
  const input = inputSchema.parse(args);

  const dataset = datasetStore.get(input.datasetId);
  if (!dataset) {
    return {
      error: {
        code: 'DATASET_NOT_FOUND',
        message: `No dataset found for datasetId="${input.datasetId}". Run load_trades first.`,
      },
    };
  }

  const fromD = toDateOrNull(input.from);
  const toD = toDateOrNull(input.to);

  let trades = dataset.trades;

  if (fromD) trades = trades.filter((t) => t.enteredAt >= fromD);
  if (toD) trades = trades.filter((t) => t.enteredAt <= toD);

  const overall = computePnlStats(trades);

  let breakdown: any[] | null = null;
  if (input.groupBy) {
    const groupBy = input.groupBy as GroupByKey;
    const grouped = groupTrades(trades, groupBy);

    breakdown = [...grouped.entries()]
      .map(([key, groupTrades]) => ({
        key,
        ...computePnlStats(groupTrades),
      }))
      .sort(
        (a, b) =>
          b.pnl - a.pnl || b.count - a.count || a.key.localeCompare(b.key),
      );

    breakdown = breakdown.slice(0, input.topN ?? 15);
  }

  return {
    datasetId: dataset.id,
    filter: {
      from: fromD ? fromD.toISOString() : null,
      to: toD ? toD.toISOString() : null,
    },
    overall,
    breakdown,
  };
}
