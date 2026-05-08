import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  commitTradeImport,
  previewTradeImport,
} from '../../services/tradeImportService.js';
import { listTradeImportsForUser } from '../../repositories/tradeImportRepository.js';

const importCsvRequestSchema = z.object({
  fileName: z.string().min(1).optional(),
  csvText: z.string().min(1),
});

export async function postCsvImport(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = importCsvRequestSchema.parse(req.body);
    const preview = await previewTradeImport(input);
    const commit = await commitTradeImport({
      userId: req.user.id,
      preview,
      source: 'csv-upload',
    });

    res.status(201).json({
      import: commit,
      preview: {
        fileName: preview.fileName,
        columns: preview.columns,
        warnings: preview.warnings,
        totalRows: preview.totalRows,
        validRows: preview.validRows,
        invalidRows: preview.invalidRows,
        errors: preview.errors.slice(0, 25),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getImports(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const imports = await listTradeImportsForUser(req.user.id);
    res.json({ imports });
  } catch (error) {
    next(error);
  }
}
