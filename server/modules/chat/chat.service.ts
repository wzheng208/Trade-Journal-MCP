// import { openai } from '../../lib/openai.js';
// import { TRADE_CHAT_SYSTEM_PROMPT } from './chat.prompt.js';
// import { chatToolDefinitions, executeChatTool } from './chat.tools.js';
// import type { RunChatInput, RunChatResult } from './chat.types.js';

// type ResponseToolCall = {
//   id: string;
//   name: string;
//   arguments: string;
// };

// function extractSingleToolCall(response: any): ResponseToolCall | null {
//   const toolCallItem = response.output?.find(
//     (item: any) => item.type === 'function_call',
//   );

//   if (!toolCallItem) return null;

//   return {
//     id: toolCallItem.call_id,
//     name: toolCallItem.name,
//     arguments: toolCallItem.arguments,
//   };
// }

// export async function runChat({
//   userId,
//   messages,
// }: RunChatInput): Promise<RunChatResult> {
//   const firstResponse = await openai.responses.create({
//     model: 'gpt-5.4',
//     instructions: TRADE_CHAT_SYSTEM_PROMPT,
//     input: messages.map((m) => ({
//       role: m.role,
//       content: m.content,
//     })),
//     tools: chatToolDefinitions,
//   });

//   const toolCall = extractSingleToolCall(firstResponse);

//   if (!toolCall) {
//     return {
//       message: {
//         role: 'assistant',
//         content: firstResponse.output_text ?? 'No response generated.',
//       },
//     };
//   }

//   const parsedArgs = JSON.parse(toolCall.arguments);

//   const toolResult = await executeChatTool(toolCall.name, parsedArgs, {
//     userId,
//   });

//   const secondResponse = await openai.responses.create({
//     model: 'gpt-5.4',
//     instructions: TRADE_CHAT_SYSTEM_PROMPT,
//     tools: chatToolDefinitions,
//     input: [
//       ...messages.map((m) => ({
//         role: m.role,
//         content: m.content,
//       })),
//       {
//         type: 'function_call_output',
//         call_id: toolCall.id,
//         output: JSON.stringify(toolResult),
//       },
//     ],
//   });

//   return {
//     message: {
//       role: 'assistant',
//       content: secondResponse.output_text ?? 'No response generated.',
//     },
//   };
// }

import { executeChatTool } from './chat.tools.js';
import type { RunChatInput, RunChatResult } from './chat.types.js';

function formatPnlSummary(result: any): string {
  if (result.error === 'NO_IMPORTED_TRADES') {
    return 'Import a CSV first, then I can analyze your trades.';
  }

  const overall = result.overall;
  const breakdown = result.breakdown ?? [];

  const lines = [
    `Your overall PnL is ${overall.pnl.toFixed(2)}.`,
    `Net after fees is ${overall.netAfterFees.toFixed(2)}.`,
    `You have ${overall.count} trades with a ${overall.winRate.toFixed(2)}% win rate.`,
  ];

  if (breakdown.length > 0) {
    lines.push('', 'By symbol:');
    for (const row of breakdown) {
      lines.push(
        `- ${row.key}: PnL ${row.pnl.toFixed(2)}, net ${row.netAfterFees.toFixed(
          2,
        )}, ${row.count} trades`,
      );
    }
  }

  return lines.join('\n');
}

function formatRows(title: string, rows: any[]): string {
  if (!rows.length) return `${title}\nNo closed trades found yet.`;

  return [
    title,
    ...rows.slice(0, 10).map((row) => {
      const pf =
        row.profitFactor === null ? 'n/a' : Number(row.profitFactor).toFixed(3);
      return `- ${row.key}: net ${row.netAfterFees.toFixed(2)}, PnL ${row.pnl.toFixed(
        2,
      )}, ${row.count} trades, ${row.winRate.toFixed(2)}% win rate, PF ${pf}`;
    }),
  ].join('\n');
}

function formatDatasetInfo(result: any): string {
  if (result.error === 'NO_IMPORTED_TRADES') {
    return 'Import a CSV first, then I can summarize your trading dataset.';
  }

  return [
    `I found ${result.rowCount} imported trades across ${result.symbolsCount} symbols.`,
    `Total PnL is ${result.totals.pnl.toFixed(2)} and net after fees is ${result.totals.netAfterFees.toFixed(
      2,
    )}.`,
    `Open trades: ${result.totals.openTrades}.`,
    result.symbolsSample.length
      ? `Symbols sampled: ${result.symbolsSample.join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatWinRate(result: any): string {
  if (result.error === 'NO_IMPORTED_TRADES') {
    return 'Import a CSV first, then I can calculate your win rate.';
  }

  return `Your win rate is ${result.winRate.toFixed(2)}% across ${
    result.count
  } trades: ${result.wins} wins, ${result.losses} losses, and ${
    result.breakeven
  } breakeven.`;
}

function formatLargestWinLoss(result: any): string {
  if (result.error === 'NO_IMPORTED_TRADES') {
    return 'Import a CSV first, then I can find your largest win and loss.';
  }

  const win = result.largestWin
    ? `${result.largestWin.symbol} ${result.largestWin.side}, PnL ${result.largestWin.pnl.toFixed(
        2,
      )}`
    : 'No winning trade found';
  const loss = result.largestLoss
    ? `${result.largestLoss.symbol} ${result.largestLoss.side}, PnL ${result.largestLoss.pnl.toFixed(
        2,
      )}`
    : 'No losing trade found';

  return [`Largest win: ${win}.`, `Largest loss: ${loss}.`].join('\n');
}

export async function runChat({
  userId,
  messages,
}: RunChatInput): Promise<RunChatResult> {
  const lastMessage =
    messages[messages.length - 1]?.content.toLowerCase() ?? '';

  if (
    lastMessage.includes('symbol') ||
    lastMessage.includes('ticker') ||
    lastMessage.includes('contract')
  ) {
    const result = (await executeChatTool(
      'performance_by_symbol',
      {},
      { userId },
    )) as any;

    return {
      message: {
        role: 'assistant',
        content: formatRows('Performance by symbol:', result.rows ?? []),
      },
    };
  }

  if (lastMessage.includes('long') || lastMessage.includes('short')) {
    const result = (await executeChatTool(
      'performance_by_side',
      {},
      { userId },
    )) as any;

    return {
      message: {
        role: 'assistant',
        content: formatRows('Performance by side:', result.rows ?? []),
      },
    };
  }

  if (
    lastMessage.includes('weekday') ||
    lastMessage.includes('day of week') ||
    lastMessage.includes('monday') ||
    lastMessage.includes('friday')
  ) {
    const result = (await executeChatTool(
      'performance_by_day_of_week',
      {},
      { userId },
    )) as any;

    return {
      message: {
        role: 'assistant',
        content: formatRows('Performance by day of week:', result.rows ?? []),
      },
    };
  }

  if (lastMessage.includes('win rate') || lastMessage.includes('winrate')) {
    const result = await executeChatTool('win_rate', {}, { userId });

    return {
      message: {
        role: 'assistant',
        content: formatWinRate(result),
      },
    };
  }

  if (
    lastMessage.includes('largest') ||
    lastMessage.includes('biggest') ||
    lastMessage.includes('best trade') ||
    lastMessage.includes('worst trade')
  ) {
    const result = await executeChatTool('largest_win_loss', {}, { userId });

    return {
      message: {
        role: 'assistant',
        content: formatLargestWinLoss(result),
      },
    };
  }

  if (
    lastMessage.includes('summary') ||
    lastMessage.includes('overview') ||
    lastMessage.includes('dataset') ||
    lastMessage.includes('import')
  ) {
    const result = await executeChatTool('dataset_info', {}, { userId });

    return {
      message: {
        role: 'assistant',
        content: formatDatasetInfo(result),
      },
    };
  }

  if (
    lastMessage.includes('pnl') ||
    lastMessage.includes('profit') ||
    lastMessage.includes('loss') ||
    lastMessage.includes('net')
  ) {
    const result = await executeChatTool(
      'pnl_summary',
      { groupBy: 'symbol' },
      { userId },
    );

    return {
      message: {
        role: 'assistant',
        content: formatPnlSummary(result),
      },
    };
  }

  return {
    message: {
      role: 'assistant',
      content:
        'I can answer rule-based analytics questions right now. Try asking about PnL, win rate, performance by symbol, long vs short, weekdays, largest win/loss, or a dataset summary.',
    },
  };
}
