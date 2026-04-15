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

export async function runChat({
  userId,
  messages,
}: RunChatInput): Promise<RunChatResult> {
  const lastMessage =
    messages[messages.length - 1]?.content.toLowerCase() ?? '';

  if (lastMessage.includes('pnl')) {
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
      content: 'Chat route is wired, but live model calls are not enabled yet.',
    },
  };
}