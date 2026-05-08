import {
  pnlSummaryInputSchema,
  pnlSummaryTool,
} from '../../mcp/tools/pnlSummary.js';
import { datasetInfoTool } from '../../mcp/tools/datasetInfo.js';
import { largestWinLossTool } from '../../mcp/tools/largestWinLoss.js';
import { performanceByDayOfWeekTool } from '../../mcp/tools/performanceByDayOfWeek.js';
import { performanceBySideTool } from '../../mcp/tools/performanceBySide.js';
import { performanceBySymbolTool } from '../../mcp/tools/performanceBySymbol.js';
import { winRateTool } from '../../mcp/tools/winRate.js';
import { listTradeImportsForUser } from '../../repositories/tradeImportRepository.js';

const chatPnlSummaryArgsSchema = pnlSummaryInputSchema.omit({
  userId: true,
});

async function getLatestDatasetId(userId: string): Promise<string | null> {
  const imports = await listTradeImportsForUser(userId);
  return imports.find((row) => row.status === 'imported')?.id ?? null;
}

export const chatToolDefinitions = [
  {
    type: 'function' as const,
    name: 'pnl_summary',
    description:
      'Get a profit and loss summary for the authenticated user’s trades.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Optional start date filter in ISO format.',
        },
        to: {
          type: 'string',
          description: 'Optional end date filter in ISO format.',
        },
        groupBy: {
          type: 'string',
          enum: ['symbol', 'side', 'tradeDay'],
          description: 'Optional grouping dimension.',
        },
        topN: {
          type: 'number',
          description: 'Optional max number of breakdown rows to return.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
];

export async function executeChatTool(
  toolName: string,
  rawArgs: unknown,
  ctx: { userId: string },
) {
  switch (toolName) {
    case 'pnl_summary': {
      const args = chatPnlSummaryArgsSchema.parse(rawArgs);

      return pnlSummaryTool({
        ...args,
        userId: ctx.userId,
      });
    }

    case 'dataset_info': {
      const datasetId = await getLatestDatasetId(ctx.userId);
      if (!datasetId) return { error: 'NO_IMPORTED_TRADES' };
      return datasetInfoTool({ datasetId, userId: ctx.userId });
    }

    case 'win_rate': {
      const datasetId = await getLatestDatasetId(ctx.userId);
      if (!datasetId) return { error: 'NO_IMPORTED_TRADES' };
      return winRateTool({ datasetId, userId: ctx.userId });
    }

    case 'performance_by_symbol': {
      const datasetId = await getLatestDatasetId(ctx.userId);
      if (!datasetId) return { error: 'NO_IMPORTED_TRADES' };
      return performanceBySymbolTool({ datasetId, userId: ctx.userId });
    }

    case 'performance_by_side': {
      const datasetId = await getLatestDatasetId(ctx.userId);
      if (!datasetId) return { error: 'NO_IMPORTED_TRADES' };
      return performanceBySideTool({ datasetId, userId: ctx.userId });
    }

    case 'performance_by_day_of_week': {
      const datasetId = await getLatestDatasetId(ctx.userId);
      if (!datasetId) return { error: 'NO_IMPORTED_TRADES' };
      return performanceByDayOfWeekTool({ datasetId, userId: ctx.userId });
    }

    case 'largest_win_loss': {
      const datasetId = await getLatestDatasetId(ctx.userId);
      if (!datasetId) return { error: 'NO_IMPORTED_TRADES' };
      return largestWinLossTool({ datasetId, userId: ctx.userId });
    }

    default:
      throw new Error(`Unsupported chat tool: ${toolName}`);
  }
}
