import { z } from 'zod';
import {
  analyticsBaseInputSchema,
  getPerformanceBySide,
} from '../../services/tradeAnalyticsService.js';

export const performanceBySideInputSchema = analyticsBaseInputSchema;
export type PerformanceBySideArgs = z.infer<
  typeof performanceBySideInputSchema
>;

export async function performanceBySideTool(args: PerformanceBySideArgs) {
  return getPerformanceBySide(args);
}
