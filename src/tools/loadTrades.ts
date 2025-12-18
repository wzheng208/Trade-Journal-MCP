import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Trade } from '../domain/trades.js';
import { parseCsvText } from '../services/csvParser.js';
import { datasetStore } from '../services/datasetStore.js';
import { requireColumns } from '../util/schema.js';
import { rowToTrade, type TradeCsvRow } from '../services/tradeCsvAdapter.js';

const inputSchema = z
  .object({
    path: z.string().optional(),
    csvText: z.string().optional(),
  })
  .refine((v) => v.path || v.csvText, {
    message: 'Provide either "path" or "csvText".',
  });

export async function loadTradesTool(args: unknown) {
  
  const input = inputSchema.parse(args);

  let csvText = input.csvText;
  if (!csvText && input.path) {
    const resolved = path.resolve(input.path);
    csvText = await fs.readFile(resolved, 'utf8');
  }

  const { columns, records } = parseCsvText(csvText!);

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

  const trades: Trade[] = (records as unknown as TradeCsvRow[]).map((r, idx) =>
    rowToTrade(r, idx, warnings),
  );

  const dataset = datasetStore.create({
    trades,
    columns,
    warnings,
  });

  return {
    datasetId: dataset.id,
    rowCount: trades.length,
    columns: dataset.columns,
    warnings: dataset.warnings,
  };
}
