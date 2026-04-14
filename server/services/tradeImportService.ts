import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { LoadTradesInputSchema, TradeSchema, type Trade } from '@trade/shared';

import { parseCsvText } from './csvParser.js';
import { requireColumns } from '../util/schema.js';
import { rowToTrade, type TradeCsvRow } from './tradeCsvAdapter.js';
import {
  createTradeImport,
  updateTradeImportStatus,
} from '../repositories/tradeImportRepository.js';
import { insertTrades } from '../repositories/tradeRepository.js';
import { insertImportErrors } from '../repositories/importErrorRepository.js';

const previewTradeImportInputSchema = LoadTradesInputSchema.safeExtend({
  fileName: z.string().optional(),
});

export type PreviewTradeImportInput = z.infer<
  typeof previewTradeImportInputSchema
>;

export type PreviewTradeImportError = {
  rowNumber: number;
  errorMessage: string;
  rawData: Record<string, unknown>;
};

export type PreviewTradeImportResult = {
  fileName: string;
  columns: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  validTrades: Trade[];
  errors: PreviewTradeImportError[];
};

function summarizeZodError(err: z.ZodError, maxLen = 240) {
  const msg = err.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return msg.length > maxLen ? `${msg.slice(0, maxLen)}…` : msg;
}

export async function previewTradeImport(
  args: PreviewTradeImportInput,
): Promise<PreviewTradeImportResult> {
  const input = previewTradeImportInputSchema.parse(args);

  let csvText = input.csvText;
  if (!csvText && input.path) {
    csvText = await fs.readFile(path.resolve(input.path), 'utf8');
  }

  if (!csvText) {
    return {
      fileName:
        input.fileName ??
        (input.path ? path.basename(input.path) : 'uploaded.csv'),
      columns: [],
      warnings: ['No CSV provided. Provide either "path" or "csvText".'],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      validTrades: [],
      errors: [],
    };
  }

  const { columns, records } = parseCsvText(csvText);
  const warnings: string[] = [];
  const errors: PreviewTradeImportError[] = [];

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

  const validTrades: Trade[] = [];

  (records as TradeCsvRow[]).forEach((row, idx) => {
    const result = rowToTrade(row, idx);

    if (!result.success) {
      errors.push({
        rowNumber: idx + 1,
        errorMessage: result.errorMessage,
        rawData: result.rawData,
      });
      return;
    }

    const parsed = TradeSchema.safeParse(result.trade);

    if (!parsed.success) {
      errors.push({
        rowNumber: idx + 1,
        errorMessage: summarizeZodError(parsed.error),
        rawData: row,
      });
      return;
    }

    validTrades.push(parsed.data);
  });

  return {
    fileName:
      (input.fileName ?? input.path)
        ? path.basename(input.path ?? '')
        : 'uploaded.csv',
    columns,
    warnings,
    totalRows: records.length,
    validRows: validTrades.length,
    invalidRows: errors.length,
    validTrades,
    errors,
  };
}

export async function commitTradeImport(input: {
  userId: string;
  preview: PreviewTradeImportResult;
  source?: string;
}): Promise<{
  datasetId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: string[];
}> {
  const tradeImport = await createTradeImport({
    userId: input.userId,
    fileName: input.preview.fileName,
    source: input.source ?? 'csv',
    columns: input.preview.columns,
    warnings: input.preview.warnings,
  });

  try {
    await insertTrades(
      input.preview.validTrades.map((trade) => {
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
      }),
    );

    await insertImportErrors(
      input.preview.errors.map((error) => ({
        importId: tradeImport.id,
        rowNumber: error.rowNumber,
        errorMessage: error.errorMessage,
        rawData: error.rawData,
      })),
    );

    await updateTradeImportStatus({
      importId: tradeImport.id,
      userId: input.userId,
      status: 'imported',
      totalRows: input.preview.totalRows,
      validRows: input.preview.validRows,
      invalidRows: input.preview.invalidRows,
    });

    return {
      datasetId: tradeImport.id,
      totalRows: input.preview.totalRows,
      validRows: input.preview.validRows,
      invalidRows: input.preview.invalidRows,
      warnings: input.preview.warnings,
    };
  } catch (error) {
    await updateTradeImportStatus({
      importId: tradeImport.id,
      userId: input.userId,
      status: 'failed',
      totalRows: input.preview.totalRows,
      validRows: input.preview.validRows,
      invalidRows: input.preview.invalidRows,
    });

    throw error;
  }
}
