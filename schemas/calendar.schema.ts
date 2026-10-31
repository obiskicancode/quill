import { z } from 'zod';

import { BLOCK_REASONS } from '@/constants/calendar';
import { ERROR_MESSAGES } from '@/constants/error-messages';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const blockCheckSchema = z
  .object({
    roomIds: z
      .array(z.string().uuid())
      .min(1, ERROR_MESSAGES.SELECT_AT_LEAST_ONE_ROOM),
    startDate: z
      .string()
      .regex(dateRegex, ERROR_MESSAGES.INVALID_START_DATE_FORMAT),
    endDate: z
      .string()
      .regex(dateRegex, ERROR_MESSAGES.INVALID_END_DATE_FORMAT),
    excludeBlockId: z.string().uuid().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: ERROR_MESSAGES.END_DATE_AFTER_START,
    path: ['endDate'],
  });

export type BlockCheckInput = z.infer<typeof blockCheckSchema>;

export const createBlockSchema = z
  .object({
    roomIds: z
      .array(z.string().uuid())
      .min(1, ERROR_MESSAGES.SELECT_AT_LEAST_ONE_ROOM),
    startDate: z
      .string()
      .regex(dateRegex, ERROR_MESSAGES.INVALID_START_DATE_FORMAT),
    endDate: z
      .string()
      .regex(dateRegex, ERROR_MESSAGES.INVALID_END_DATE_FORMAT),
    reason: z.enum(BLOCK_REASONS),
    notes: z.string().max(1000, ERROR_MESSAGES.NOTES_TOO_LONG).optional(),
    backdateReason: z.string().max(500).optional(),
    idempotencyKey: z.string().min(1, ERROR_MESSAGES.IDEMPOTENCY_KEY_MISSING),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: ERROR_MESSAGES.END_DATE_AFTER_START,
    path: ['endDate'],
  });

export type CreateBlockInput = z.infer<typeof createBlockSchema>;

export const updateBlockSchema = z
  .object({
    roomId: z.string().uuid(ERROR_MESSAGES.INVALID_ROOM_ID),
    startDate: z
      .string()
      .regex(dateRegex, ERROR_MESSAGES.INVALID_START_DATE_FORMAT),
    endDate: z
      .string()
      .regex(dateRegex, ERROR_MESSAGES.INVALID_END_DATE_FORMAT),
    reason: z.enum(BLOCK_REASONS),
    notes: z.string().max(1000, ERROR_MESSAGES.NOTES_TOO_LONG).optional(),
    backdateReason: z.string().max(500).optional(),
    version: z.string().min(1, ERROR_MESSAGES.VERSION_TOKEN_MISSING),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: ERROR_MESSAGES.END_DATE_AFTER_START,
    path: ['endDate'],
  });

export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;

export const blocksListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  roomTypeId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  reason: z.enum(BLOCK_REASONS).optional(),
  status: z
    .enum(['all', 'upcoming', 'current', 'past'] as const)
    .default('all'),
});

export type BlocksListQueryInput = z.infer<typeof blocksListQuerySchema>;

export const calendarQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.coerce
    .number()
    .int()
    .refine((n) => [14, 30, 60].includes(n), {
      message: ERROR_MESSAGES.DAYS_OPTIONS_INVALID,
    })
    .default(14),
  roomTypeId: z.string().uuid().optional(),
});

export const calendarDayQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
