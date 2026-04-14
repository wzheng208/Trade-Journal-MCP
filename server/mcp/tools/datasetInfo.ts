import { z } from 'zod';
import type { Trade } from '@trade/shared';
import { computeDatasetInfoStats } from '../../analytics/tradeStats.js';
import { getTradeImportById } from '../../repositories/tradeImportRepository.js';
import { getTradesByImportId } from '../../repositories/tradeRepository.js';

export const datasetInfoInputSchema = z.object({
  datasetId: z.string().min(1),
  userId: z.string().uuid(),
});

export type DatasetInfoArgs = z.infer<typeof datasetInfoInputSchema>;

function mapTradeRecordToSharedTrade(row: {
  id: string;
  external_id: string | null;
  symbol: string;
  side: string;
  size: number;
  entered_at: string;
  exited_at: string | null;
  entry_price: string;
  exit_price: string | null;
  fees: string;
  pnl: string | null;
}): Trade {
  return {
    id: row.external_id ?? row.id,
    symbol: row.symbol,
    side: row.side as 'Long' | 'Short',
    qty: row.size,
    enteredAt: row.entered_at,
    exitedAt: row.exited_at ?? undefined,
    entryPrice: Number(row.entry_price),
    exitPrice: row.exit_price !== null ? Number(row.exit_price) : undefined,
    fees: Number(row.fees),
    pnl: row.pnl !== null ? Number(row.pnl) : undefined,
    tradeDay: row.entered_at ? row.entered_at.slice(0, 10) : undefined,
  };
}

export async function datasetInfoTool(args: DatasetInfoArgs) {
  const { datasetId, userId } = datasetInfoInputSchema.parse(args);

  const tradeImport = await getTradeImportById(datasetId, userId);

  if (!tradeImport) {
    return {
      error: {
        code: 'DATASET_NOT_FOUND' as const,
        message: `No dataset found for datasetId="${datasetId}".`,
      },
    };
  }

  const tradeRows = await getTradesByImportId(datasetId, userId);
  const trades = tradeRows.map(mapTradeRecordToSharedTrade);

  const stats = computeDatasetInfoStats(trades);

  return {
    datasetId: tradeImport.id,
    createdAt: tradeImport.created_at,
    rowCount: trades.length,
    columns: tradeImport.columns,
    warnings: tradeImport.warnings,
    symbolsCount: stats.symbolsCount,
    symbolsSample: stats.symbolsSample,
    sideCounts: stats.sideCounts,
    totals: stats.totals,
    durationsMinutes: stats.durationsMinutes,
  };
}
