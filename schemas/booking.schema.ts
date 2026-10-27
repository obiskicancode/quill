import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';

export const referenceSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{6,30}$/, ERROR_MESSAGES.BOOKING_REFERENCE_INVALID);

/** The verify form. Used by the browser and the server. */
export const verifyRequestSchema = z.object({
  reference: referenceSchema,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, ERROR_MESSAGES.BOOKING_EMAIL_REQUIRED)
    .email(ERROR_MESSAGES.VALID_EMAIL_REQUIRED),
  /** 'manage' opens a 30-minute management session; 'view' is the confirmation page. */
  scope: z.enum(['view', 'manage']).default('view'),
});
export type VerifyRequest = z.input<typeof verifyRequestSchema>;
