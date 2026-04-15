import {
  pnlSummaryInputSchema,
  pnlSummaryTool,
} from '../../mcp/tools/pnlSummary.js';

const chatPnlSummaryArgsSchema = pnlSummaryInputSchema.omit({
  userId: true,
});

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

    default:
      throw new Error(`Unsupported chat tool: ${toolName}`);
  }
}
