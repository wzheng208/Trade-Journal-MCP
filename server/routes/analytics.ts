import { Router } from 'express';
import { getAnalyticsOverview } from '../modules/analytics/analytics.controller.js';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js';

const router = Router();

router.get('/overview', requireSupabaseAuth, getAnalyticsOverview);

export default router;
