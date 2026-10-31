import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';

export const StaffInviteInputSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, ERROR_MESSAGES.FIRST_NAME_REQUIRED)
    .max(100),
  lastName: z
    .string()
    .trim()
    .min(2, ERROR_MESSAGES.LAST_NAME_REQUIRED)
    .max(100),
  email: z
    .string()
    .trim()
    .email(ERROR_MESSAGES.INVALID_EMAIL_ADDRESS)
    .toLowerCase(),
  role: z.enum(['reception', 'manager', 'owner']),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
});

export type StaffInviteInput = z.infer<typeof StaffInviteInputSchema>;

export const StaffUpdateInputSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, ERROR_MESSAGES.FIRST_NAME_REQUIRED)
    .max(100),
  lastName: z
    .string()
    .trim()
    .min(2, ERROR_MESSAGES.LAST_NAME_REQUIRED)
    .max(100),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  role: z.enum(['reception', 'manager', 'owner']),
  version: z.string().or(z.number()),
});

export type StaffUpdateInput = z.infer<typeof StaffUpdateInputSchema>;

export const StaffQuerySchema = z.object({
  role: z.enum(['all', 'reception', 'manager', 'owner']).default('all'),
  status: z
    .enum(['all', 'active', 'invited', 'deactivated', 'locked'])
    .default('all'),
  q: z.string().trim().optional(),
});

export type StaffQueryParams = z.infer<typeof StaffQuerySchema>;

export const StepUpAuthInputSchema = z
  .object({
    password: z.string().min(1, ERROR_MESSAGES.PASSWORD_REQUIRED).optional(),
    totpCode: z
      .string()
      .regex(/^\d{6}$/, ERROR_MESSAGES.SIX_DIGIT_CODE_REQUIRED)
      .optional(),
  })
  .refine((data) => data.password || data.totpCode, {
    message: ERROR_MESSAGES.STEP_UP_CREDENTIALS_REQUIRED,
  });

export type StepUpAuthInput = z.infer<typeof StepUpAuthInputSchema>;
