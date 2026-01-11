import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  LoadTradesInputSchema,
  TradeSchema,
  type LoadTradesInput,
  type Trade,
} from '@trade/shared';

import { parseCsvText } from '../services/csvParser';
import { datasetStore } from '../services/datasetStore';
import { requireColumns } from '../util/schema';
import { rowToTrade } from '../services/tradeCsvAdapter';

export const loadTradesInputSchema = LoadTradesInputSchema;
export type LoadTradesArgs = LoadTradesInput;

export type LoadTradesResult = {
  datasetId: string;
  rowCount: number;
  columns: string[];
  warnings: string[];
};

function summarizeZodError(err: z.ZodError, maxLen = 240) {
  const msg = err.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return msg.length > maxLen ? msg.slice(0, maxLen) + '…' : msg;
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
  for (const col of missing) warnings.push(`Missing required column: ${col}`);

  // ✅ don’t pretend records are TradeCsvRow[]; they’re generic row objects
  const normalizedTrades = (records as Array<Record<string, unknown>>).map(
    (r, idx) => rowToTrade(r, idx, warnings),
  );

  const trades: Trade[] = [];
  normalizedTrades.forEach((t, idx) => {
    const parsed = TradeSchema.safeParse(t);
    if (!parsed.success) {
      warnings.push(
        `Row ${idx + 1}: invalid trade - ${summarizeZodError(parsed.error)}`,
      );
      return;
    }
    trades.push(parsed.data);
  });

  const dataset = datasetStore.create({ trades, columns, warnings });

  return {
    datasetId: dataset.id,
    rowCount: trades.length,
    columns: dataset.columns,
    warnings: dataset.warnings,
  };
}
