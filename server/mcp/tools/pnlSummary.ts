import { z } from 'zod';
import { toDateOrNull } from '../../util/dates.js';
import { computePnlStats, groupTrades } from '../../analytics/pnl.js';
import {
  GroupByKeySchema,
  type GroupByKey,
  type PnlStats,
} from '@trade/shared';
import { listTradesByUserId } from '../../repositories/tradeRepository.js';
import { mapTradeRecordToTrade } from '../../domain/trades.js';

export const pnlSummaryInputSchema = z.object({
  userId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  groupBy: GroupByKeySchema.optional(),
  topN: z.number().int().positive().max(50).optional(),
});

export type PnlSummaryArgs = z.infer<typeof pnlSummaryInputSchema>;

export type PnlBreakdownRow = { key: string } & PnlStats;

export type PnlSummaryResult = {
  filter: { from: string | null; to: string | null };
  overall: PnlStats;
  breakdown: PnlBreakdownRow[] | null;
};

export async function pnlSummaryTool(
  args: PnlSummaryArgs,
): Promise<PnlSummaryResult> {
  const input = pnlSummaryInputSchema.parse(args);

  const tradeRows = await listTradesByUserId(input.userId);
  let trades = tradeRows.map(mapTradeRecordToTrade);

  const fromD = toDateOrNull(input.from);
  const toD = toDateOrNull(input.to);

  if (fromD) trades = trades.filter((t) => t.enteredAt >= fromD);
  if (toD) trades = trades.filter((t) => t.enteredAt <= toD);

  const overall = computePnlStats(trades);

  let breakdown: PnlBreakdownRow[] | null = null;

  if (input.groupBy) {
    const groupBy: GroupByKey = input.groupBy;
    const grouped = groupTrades(trades, groupBy);

    breakdown = [...grouped.entries()]
      .map(([key, groupedTrades]) => ({
        key,
        ...computePnlStats(groupedTrades),
      }))
      .sort(
        (a, b) =>
          b.pnl - a.pnl || b.count - a.count || a.key.localeCompare(b.key),
      )
      .slice(0, input.topN ?? 15);
  }

  return {
    filter: {
      from: fromD ? fromD.toISOString() : null,
      to: toD ? toD.toISOString() : null,
    },
    overall,
    breakdown,
  };
}
