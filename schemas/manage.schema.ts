import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { detailsPatchSchema } from '@/schemas/checkout.schema';
import { CANCEL_REASONS } from '@/types/manage.types';

const key = z.string().min(16).max(64);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MESSAGES.INVALID_DATE);

export const cancelRequestSchema = z.object({
  idempotencyKey: key,
  reason: z.enum(CANCEL_REASONS).nullish(),
  note: z.string().trim().max(300, ERROR_MESSAGES.NOTE_TOO_LONG).nullish(),
  /** The guest ticked "I understand this cannot be undone". */
  acknowledged: z.literal(true, {
    message: ERROR_MESSAGES.CANCEL_ACKNOWLEDGEMENT_REQUIRED,
  }),
  /** The refund the guest was shown. If the server now calculates something else, the cancel is refused and the guest sees the new amount. */
  expectedRefundMinor: z.number().int().nonnegative(),
});
export type CancelRequest = z.infer<typeof cancelRequestSchema>;

export const changeQuoteRequestSchema = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
});

export const changeDatesRequestSchema = z.object({
  idempotencyKey: key,
  quoteId: z.string().min(4).max(60),
});
export type ChangeDatesRequest = z.infer<typeof changeDatesRequestSchema>;

/** PATCH /details. Email is not accepted. */
export const detailsRequestSchema = z.object({
  idempotencyKey: key,
  details: detailsPatchSchema,
});
export type DetailsRequest = z.input<typeof detailsRequestSchema>;
