import { z } from 'zod';
import {
  analyticsBaseInputSchema,
  getPerformanceByDayOfWeek,
} from '../../services/tradeAnalyticsService.js';

export const performanceByDayOfWeekInputSchema = analyticsBaseInputSchema;
export type PerformanceByDayOfWeekArgs = z.infer<
  typeof performanceByDayOfWeekInputSchema
>;

export async function performanceByDayOfWeekTool(
  args: PerformanceByDayOfWeekArgs,
) {
  return getPerformanceByDayOfWeek(args);
}
