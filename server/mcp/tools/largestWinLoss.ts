import { z } from 'zod';
import {
  analyticsBaseInputSchema,
  getLargestWinLoss,
} from '../../services/tradeAnalyticsService.js';

export const largestWinLossInputSchema = analyticsBaseInputSchema;
export type LargestWinLossArgs = z.infer<typeof largestWinLossInputSchema>;

export async function largestWinLossTool(args: LargestWinLossArgs) {
  return getLargestWinLoss(args);
}
