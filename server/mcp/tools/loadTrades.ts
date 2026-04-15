import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  LoadTradesInputSchema,
  LoadTradesResponseSchema,
  TradeSchema,
  type Trade,
} from '@trade/shared';

import { parseCsvText } from '../../services/csvParser.js';
import { requireColumns } from '../../util/schema.js';
import {
  rowToTrade,
  type TradeCsvRow,
} from '../../services/tradeCsvAdapter.js';
import { createTradeImport } from '../../repositories/tradeImportRepository.js';
import { insertTrades } from '../../repositories/tradeRepository.js';

export const loadTradesInputSchema = LoadTradesInputSchema.safeExtend({
  userId: z.string().uuid(),
});

export type LoadTradesArgs = z.infer<typeof loadTradesInputSchema>;
export type LoadTradesResult = z.infer<typeof LoadTradesResponseSchema>;

function summarizeZodError(err: z.ZodError, maxLen = 240) {
  const msg = err.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return msg.length > maxLen ? `${msg.slice(0, maxLen)}…` : msg;
}

export async function loadTradesTool(
  args: LoadTradesArgs,
): Promise<LoadTradesResult> {
  const input = loadTradesInputSchema.parse(args);

  let csvText = input.csvText;
  if (!csvText && input.path) {
    csvText = await fs.readFile(path.resolve(input.path), 'utf8');
  }

  if (!csvText) {
    return {
      datasetId: '',
      rowCount: 0,
      columns: [],
      warnings: ['No CSV provided. Provide either "path" or "csvText".'],
    };
  }

  const { columns, records } = parseCsvText(csvText);
  const warnings: string[] = [];

  const required = [
    'Id',
    'ContractName',
    'EnteredAt',
    'EntryPrice',
    'Size',
    'Type',
  ];

  const missing = requireColumns(columns, required);
  for (const col of missing) {
    warnings.push(`Missing required column: ${col}`);
  }

  // If required columns are missing, stop before row-level mapping/validation.
  if (missing.length > 0) {
    const tradeImport = await createTradeImport({
      userId: input.userId,
      fileName: input.path ? path.basename(input.path) : 'uploaded.csv',
      source: 'csv',
      columns,
      warnings,
    });

    return {
      datasetId: tradeImport.id,
      rowCount: 0,
      columns,
      warnings,
    };
  }

  const trades: Trade[] = [];

  (records as TradeCsvRow[]).forEach((row, idx) => {
    try {
      const mapped = rowToTrade(row, idx);

      if (!mapped.success) {
        warnings.push(mapped.errorMessage);
        return;
      }

      const parsed = TradeSchema.safeParse(mapped.trade);

      if (!parsed.success) {
        warnings.push(
          `Row ${idx + 1}: invalid trade - ${summarizeZodError(parsed.error)}`,
        );
        return;
      }

      trades.push(parsed.data);
    } catch (error) {
      warnings.push(
        `Row ${idx + 1}: failed to map trade row - ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  });

  const tradeImport = await createTradeImport({
    userId: input.userId,
    fileName: input.path ? path.basename(input.path) : 'uploaded.csv',
    source: 'csv',
    columns,
    warnings,
  });

  const dbTrades = trades.map((trade) => {
    if (trade.entryPrice === undefined) {
      throw new Error(`Trade ${trade.id} is missing entryPrice`);
    }

    return {
      importId: tradeImport.id,
      userId: input.userId,
      externalId: trade.id,
      symbol: trade.symbol,
      enteredAt: trade.enteredAt,
      exitedAt: trade.exitedAt ?? null,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice ?? null,
      size: trade.qty,
      side: trade.side,
      fees: trade.fees ?? 0,
      pnl: trade.pnl ?? null,
      rawData: trade,
    };
  });

  await insertTrades(dbTrades);

  return {
    datasetId: tradeImport.id,
    rowCount: trades.length,
    columns,
    warnings,
  };
}
