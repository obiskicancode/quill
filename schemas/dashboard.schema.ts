import { z } from 'zod';

export const dashboardSummaryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const dashboardOccupancyQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.coerce.number().int().min(1).max(30).default(14),
});

export const dashboardRevenueQuerySchema = z.object({
  range: z.enum(['today', '7d', 'this_month', 'last_month']).default('7d'),
});
