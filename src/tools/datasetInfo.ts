import { z } from 'zod';
import { datasetStore } from '../services/datasetStore.js';
import { computeDatasetInfoStats } from '../analytics/tradeStats.js';

const inputSchema = z.object({
  datasetId: z.string().min(1),
});

export async function datasetInfoTool(args: unknown) {
  
  const { datasetId } = inputSchema.parse(args);

  const dataset = datasetStore.get(datasetId);
  if (!dataset) {
    return {
      error: {
        code: 'DATASET_NOT_FOUND',
        message: `No dataset found for datasetId="${datasetId}". Run load_trades first.`,
      },
    };
  }

  const stats = computeDatasetInfoStats(dataset.trades);

  return {
    datasetId: dataset.id,
    createdAt: dataset.createdAt.toISOString(),
    rowCount: dataset.trades.length,
    columns: dataset.columns,
    warnings: dataset.warnings,

    symbolsCount: stats.symbolsCount,
    symbolsSample: stats.symbolsSample,

    sideCounts: stats.sideCounts,

    totals: stats.totals,
    durationsMinutes: stats.durationsMinutes,
  };
}
