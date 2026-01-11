import { z } from 'zod';
import { datasetStore } from '../services/datasetStore';
import { toDateOrNull } from '../util/dates';
import { computePnlStats, groupTrades } from '../analytics/pnl';
import {
  GroupByKeySchema,
  type GroupByKey,
  type PnlStats,
} from '@trade/shared';

export const pnlSummaryInputSchema = z.object({
  datasetId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  groupBy: GroupByKeySchema.optional(),
  topN: z.number().int().positive().max(50).optional(),
});

export type PnlSummaryArgs = z.infer<typeof pnlSummaryInputSchema>;

export type PnlBreakdownRow = { key: string } & PnlStats;

export type PnlSummaryResult =
  | {
      error: { code: 'DATASET_NOT_FOUND'; message: string };
    }
  | {
      datasetId: string;
      filter: { from: string | null; to: string | null };
      overall: PnlStats;
      breakdown: PnlBreakdownRow[] | null;
    };

export async function pnlSummaryTool(
  args: PnlSummaryArgs,
): Promise<PnlSummaryResult> {
  const dataset = datasetStore.get(args.datasetId);
  if (!dataset) {
    return {
      error: {
        code: 'DATASET_NOT_FOUND',
        message: `No dataset found for datasetId="${args.datasetId}". Run load_trades first.`,
      },
    };
  }

  const fromD = toDateOrNull(args.from);
  const toD = toDateOrNull(args.to);

  let trades = dataset.trades;

  if (fromD) trades = trades.filter((t) => t.enteredAt >= fromD);
  if (toD) trades = trades.filter((t) => t.enteredAt <= toD);

  const overall = computePnlStats(trades);

  let breakdown: PnlBreakdownRow[] | null = null;

  if (args.groupBy) {
    const groupBy: GroupByKey = args.groupBy;
    const grouped = groupTrades(trades, groupBy);

    breakdown = [...grouped.entries()]
      .map(([key, groupTrades]) => ({
        key,
        ...computePnlStats(groupTrades),
      }))
      .sort(
        (a, b) =>
          b.pnl - a.pnl || b.count - a.count || a.key.localeCompare(b.key),
      )
      .slice(0, args.topN ?? 15);
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
