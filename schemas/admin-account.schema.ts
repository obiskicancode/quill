import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';

export const adminProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.ADMIN_NAME_REQUIRED)
    .max(100, ERROR_MESSAGES.ADMIN_NAME_TOO_LONG),
  lastName: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.ADMIN_NAME_REQUIRED)
    .max(100, ERROR_MESSAGES.ADMIN_NAME_TOO_LONG),
  phone: z
    .string()
    .trim()
    .max(30, ERROR_MESSAGES.ADMIN_PHONE_TOO_LONG)
    .optional()
    .default(''),
});
export type AdminProfileInput = z.input<typeof adminProfileSchema>;

export {
  adminConfirm2faSchema,
  adminDisable2faSchema,
  adminPasswordChangeSchema,
} from './admin-auth.schema';
