import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';

export const profileSchema = z.object({
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
export type AdminProfileInput = z.input<typeof profileSchema>;

export {
  confirm2faSchema,
  disable2faSchema,
  passwordChangeSchema,
} from './auth.schema';
