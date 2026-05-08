import { Router } from 'express';
import {
  getImports,
  postCsvImport,
} from '../modules/imports/imports.controller.js';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js';

const router = Router();

router.get('/', requireSupabaseAuth, getImports);
router.post('/csv', requireSupabaseAuth, postCsvImport);

export default router;
