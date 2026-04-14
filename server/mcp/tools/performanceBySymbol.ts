import { z } from 'zod';
import {
  analyticsBaseInputSchema,
  getPerformanceBySymbol,
} from '../../services/tradeAnalyticsService.js';

export const performanceBySymbolInputSchema = analyticsBaseInputSchema;
export type PerformanceBySymbolArgs = z.infer<
  typeof performanceBySymbolInputSchema
>;

export async function performanceBySymbolTool(args: PerformanceBySymbolArgs) {
  return getPerformanceBySymbol(args);
}
