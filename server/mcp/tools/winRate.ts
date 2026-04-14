import { z } from 'zod';
import {
  analyticsBaseInputSchema,
  getWinRate,
} from '../../services/tradeAnalyticsService.js';

export const winRateInputSchema = analyticsBaseInputSchema;
export type WinRateArgs = z.infer<typeof winRateInputSchema>;

export async function winRateTool(args: WinRateArgs) {
  return getWinRate(args);
}
