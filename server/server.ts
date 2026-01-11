import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { z } from 'zod';
import { loadTradesTool, loadTradesInputSchema } from './tools/loadTrades';
import {
  datasetInfoTool,
  datasetInfoInputSchema,
} from './tools/datasetInfo';
import { pnlSummaryTool, pnlSummaryInputSchema } from './tools/pnlSummary';
import { TradeSchema } from '@trade/shared';



const server = new McpServer({
  name: 'trade-journal-mcp',
  version: '0.1.0',
});


server.tool(
  'load_trades',
  'Load trades from a CSV file path or raw CSV text, normalize them, and store them as an in-memory dataset.',
  loadTradesInputSchema.shape,
  async (args) => {
    const parsed = loadTradesInputSchema.parse(args);
    const result = await loadTradesTool(parsed);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.tool(
  'dataset_info',
  'Return summary stats and metadata for a loaded datasetId.',
  datasetInfoInputSchema.shape,
  async (args) => {
    const parsed = datasetInfoInputSchema.parse(args); // ✅ validate once here
    const result = await datasetInfoTool(parsed); // ✅ typed tool
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.tool(
  'pnl_summary',
  'Compute PnL summary stats for a dataset. Optionally filter by date and group by symbol/side/tradeDay.',
  pnlSummaryInputSchema.shape,
  async (args) => {
    const parsed = pnlSummaryInputSchema.parse(args);
    const result = await pnlSummaryTool(parsed);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

console.error('Trade Journal MCP server started');
console.error('Shared TradeSchema keys:', Object.keys(TradeSchema.shape)); // ✅ NEW

const transport = new StdioServerTransport();
await server.connect(transport);
