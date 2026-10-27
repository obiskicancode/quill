import { z } from 'zod';

import { BLOCK_REASONS } from '@/constants/calendar';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const adminBlockCheckSchema = z
  .object({
    roomIds: z.array(z.string().uuid()).min(1, 'Select at least one room.'),
    startDate: z
      .string()
      .regex(dateRegex, 'Invalid start date format (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(dateRegex, 'Invalid end date format (YYYY-MM-DD)'),
    excludeBlockId: z.string().uuid().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date.',
    path: ['endDate'],
  });

export type AdminBlockCheckInput = z.infer<typeof adminBlockCheckSchema>;

export const adminCreateBlockSchema = z
  .object({
    roomIds: z.array(z.string().uuid()).min(1, 'Select at least one room.'),
    startDate: z
      .string()
      .regex(dateRegex, 'Invalid start date format (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(dateRegex, 'Invalid end date format (YYYY-MM-DD)'),
    reason: z.enum(BLOCK_REASONS),
    notes: z
      .string()
      .max(1000, 'Notes must be 1,000 characters or less.')
      .optional(),
    backdateReason: z.string().max(500).optional(),
    idempotencyKey: z.string().min(1, 'Missing idempotency key.'),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date.',
    path: ['endDate'],
  });

export type AdminCreateBlockInput = z.infer<typeof adminCreateBlockSchema>;

export const adminUpdateBlockSchema = z
  .object({
    roomId: z.string().uuid('Invalid room ID.'),
    startDate: z
      .string()
      .regex(dateRegex, 'Invalid start date format (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(dateRegex, 'Invalid end date format (YYYY-MM-DD)'),
    reason: z.enum(BLOCK_REASONS),
    notes: z
      .string()
      .max(1000, 'Notes must be 1,000 characters or less.')
      .optional(),
    backdateReason: z.string().max(500).optional(),
    version: z.string().min(1, 'Missing version token.'),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date.',
    path: ['endDate'],
  });

export type AdminUpdateBlockInput = z.infer<typeof adminUpdateBlockSchema>;

export const adminBlocksListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  roomTypeId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  reason: z.enum(BLOCK_REASONS).optional(),
  status: z
    .enum(['all', 'upcoming', 'current', 'past'] as const)
    .default('all'),
});

export type AdminBlocksListQueryInput = z.infer<
  typeof adminBlocksListQuerySchema
>;

export const adminCalendarQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.coerce
    .number()
    .int()
    .refine((n) => [14, 30, 60].includes(n), {
      message: 'Days must be 14, 30, or 60.',
    })
    .default(14),
  roomTypeId: z.string().uuid().optional(),
});

export const adminCalendarDayQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
