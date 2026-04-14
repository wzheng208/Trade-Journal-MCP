import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import {
  datasetInfoTool,
  datasetInfoInputSchema,
} from './tools/datasetInfo.js';
import { pnlSummaryTool, pnlSummaryInputSchema } from './tools/pnlSummary.js';
import { winRateTool, winRateInputSchema } from './tools/winRate.js';
import {
  performanceBySymbolTool,
  performanceBySymbolInputSchema,
} from './tools/performanceBySymbol.js';
import {
  performanceBySideTool,
  performanceBySideInputSchema,
} from './tools/performanceBySide.js';
import {
  performanceByDayOfWeekTool,
  performanceByDayOfWeekInputSchema,
} from './tools/performanceByDayOfWeek.js';
import {
  largestWinLossTool,
  largestWinLossInputSchema,
} from './tools/largestWinLoss.js';

function asTextResult(result: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
export function registerTools(server: McpServer) {
  server.registerTool(
    'dataset_info',
    {
      title: 'Dataset Info',
      description: 'Return summary stats and metadata for a stored dataset.',
      inputSchema: datasetInfoInputSchema,
    },
    async (args) => asTextResult(await datasetInfoTool(args)),
  );

  server.registerTool(
    'pnl_summary',
    {
      title: 'PnL Summary',
      description: 'Compute PnL summary stats for a stored dataset.',
      inputSchema: pnlSummaryInputSchema,
    },
    async (args) => asTextResult(await pnlSummaryTool(args)),
  );

  server.registerTool(
    'win_rate',
    {
      title: 'Win Rate',
      description:
        'Return win/loss/breakeven counts and win rate for a stored dataset.',
      inputSchema: winRateInputSchema,
    },
    async (args) => asTextResult(await winRateTool(args)),
  );

  server.registerTool(
    'performance_by_symbol',
    {
      title: 'Performance by Symbol',
      description: 'Return performance grouped by symbol for a stored dataset.',
      inputSchema: performanceBySymbolInputSchema,
    },
    async (args) => asTextResult(await performanceBySymbolTool(args)),
  );

  server.registerTool(
    'performance_by_side',
    {
      title: 'Performance by Side',
      description: 'Return performance grouped by side for a stored dataset.',
      inputSchema: performanceBySideInputSchema,
    },
    async (args) => asTextResult(await performanceBySideTool(args)),
  );

  server.registerTool(
    'performance_by_day_of_week',
    {
      title: 'Performance by Day of Week',
      description:
        'Return performance grouped by day of week for a stored dataset.',
      inputSchema: performanceByDayOfWeekInputSchema,
    },
    async (args) => asTextResult(await performanceByDayOfWeekTool(args)),
  );

  server.registerTool(
    'largest_win_loss',
    {
      title: 'Largest Win / Loss',
      description:
        'Return the largest winning trade and largest losing trade for a stored dataset.',
      inputSchema: largestWinLossInputSchema,
    },
    async (args) => asTextResult(await largestWinLossTool(args)),
  );
}
