import { z } from 'zod';

export const SideSchema = z.enum(['Long', 'Short']);
export type Side = z.infer<typeof SideSchema>;

// Helpers
const IsoDateTimeString = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime()); // allows either with or without timezone offset

export const TradeSchema = z.object({
  id: z.string().min(1),

  symbol: z.string().min(1),
  side: SideSchema,
  qty: z.number().finite(),

  // Use ISO strings for transport/UI safety
  enteredAt: IsoDateTimeString,
  exitedAt: IsoDateTimeString.optional(),

  entryPrice: z.number().finite().optional(),
  exitPrice: z.number().finite().optional(),

  fees: z.number().finite().optional(),
  pnl: z.number().finite().optional(),

  tradeDay: z.string().optional(), // e.g. "2026-01-11"
  tradeDuration: z.string().optional(), // e.g. "00:12:31"

  commissions: z.number().finite().optional(),
});

export type Trade = z.infer<typeof TradeSchema>;

export const DatasetInfoStatsSchema = z.object({
  symbolsCount: z.number().int().nonnegative(),
  symbolsSample: z.array(z.string()),

  sideCounts: z.object({
    LONG: z.number().int().nonnegative(),
    SHORT: z.number().int().nonnegative(),
  }),

  totals: z.object({
    pnl: z.number(),
    fees: z.number(),
    netAfterFees: z.number(),
    openTrades: z.number().int().nonnegative(),
  }),

  durationsMinutes: z.object({
    count: z.number().int().nonnegative(),
    avg: z.number().nullable(),
    p50: z.number().nullable(),
    p90: z.number().nullable(),
    max: z.number().nullable(),
  }),
});

export type DatasetInfoStats = z.infer<typeof DatasetInfoStatsSchema>;

export const LoadTradesInputSchema = z
  .object({
    path: z.string().optional(),
    csvText: z.string().optional(),
  })
  .refine((v) => v.path || v.csvText, {
    message: 'Provide either "path" or "csvText".',
  });

export type LoadTradesInput = z.infer<typeof LoadTradesInputSchema>;

export const DatasetInfoInputSchema = z.object({
  datasetId: z.string().min(1),
});

export type DatasetInfoInput = z.infer<typeof DatasetInfoInputSchema>;

export const GroupByKeySchema = z.enum(['symbol', 'side', 'tradeDay']);
export type GroupByKey = z.infer<typeof GroupByKeySchema>;

export const PnlSummaryInputSchema = z.object({
  datasetId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  groupBy: GroupByKeySchema.optional(),
  topN: z.number().int().positive().max(50).optional(),
});

export const PnlStatsSchema = z.object({
  count: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  breakeven: z.number().int().nonnegative(),
  pnl: z.number(),
  fees: z.number(),
  netAfterFees: z.number(),
  avgPnl: z.number(),
  winRate: z.number(), // percent
  avgWin: z.number(),
  avgLoss: z.number(),
  expectancy: z.number(),
  profitFactor: z.number().nullable(),
});
export type PnlStats = z.infer<typeof PnlStatsSchema>;

export const DatasetInfoResponseSchema = z
  .object({
    datasetId: z.string(),
    createdAt: z.string(),
    rowCount: z.number().int().nonnegative(),
    columns: z.array(z.string()),
    warnings: z.array(z.string()),
  })
  .and(DatasetInfoStatsSchema);

export type DatasetInfoResponse = z.infer<typeof DatasetInfoResponseSchema>;

export const PnlBreakdownRowSchema = z
  .object({
    key: z.string(),
  })
  .and(PnlStatsSchema);

export const PnlSummaryResponseSchema = z.object({
  datasetId: z.string(),
  filter: z.object({
    from: z.string().nullable(),
    to: z.string().nullable(),
  }),
  overall: PnlStatsSchema,
  breakdown: z.array(PnlBreakdownRowSchema).nullable(),
});

export type PnlSummaryResponse = z.infer<typeof PnlSummaryResponseSchema>;

export const LoadTradesResponseSchema = z.object({
  datasetId: z.string(),
  rowCount: z.number().int().nonnegative(),
  columns: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type LoadTradesResponse = z.infer<typeof LoadTradesResponseSchema>;
