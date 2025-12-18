import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadTradesTool } from './tools/loadTrades.ts';
import { datasetInfoTool } from './tools/datasetInfo.ts';
import { pnlSummaryTool } from './tools/pnlSummary.ts';


const server = new McpServer({
  name: 'trade-journal-mcp',
  version: '0.1.0',
});


server.tool(
  'hello',
  'Sanity check tool to confirm the MCP server is running.',
  {
    who: z.string().default('world'),
  },
  async ({ who }) => ({
    content: [{ type: 'text', text: `hello, ${who}` }],
  }),
);

server.tool(
  'load_trades',
  'Load trades from a CSV file path or raw CSV text, normalize them, and store them as an in-memory dataset.',
  {
    path: z.string().optional(),
    csvText: z.string().optional(),
  },
  async (args) => {
    const result = await loadTradesTool(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.tool(
  'dataset_info',
  'Return summary stats and metadata for a loaded datasetId.',
  { datasetId: z.string().min(1) },
  async (args) => {
    const result = await datasetInfoTool(args);

    // If tool returns an error object, surface it cleanly
    if ((result as any).error) {
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.tool(
  'pnl_summary',
  'Compute PnL summary stats for a dataset. Optionally filter by date and group by symbol/side/tradeDay.',
  {
    datasetId: z.string().min(1),
    from: z.string().optional(),
    to: z.string().optional(),
    groupBy: z.enum(['symbol', 'side', 'tradeDay']).optional(),
    topN: z.number().int().positive().max(50).optional(),
  },
  async (args) => {
    const result = await pnlSummaryTool(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);


console.error('Trade Journal MCP server started');

const transport = new StdioServerTransport();
await server.connect(transport);
