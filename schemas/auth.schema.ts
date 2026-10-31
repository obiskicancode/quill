import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';

export const emailSchema = z
  .email(ERROR_MESSAGES.EMAIL_INVALID)
  .trim()
  .toLowerCase()
  .min(1, ERROR_MESSAGES.EMAIL_REQUIRED)
  .max(255, ERROR_MESSAGES.ADMIN_EMAIL_TOO_LONG);

const currentPassword = z
  .string()
  .min(1, ERROR_MESSAGES.ADMIN_CURRENT_PASSWORD_INVALID)
  .max(200, ERROR_MESSAGES.ADMIN_PASSWORD_TOO_LONG);

const newPassword = z
  .string()
  .min(1, ERROR_MESSAGES.ADMIN_PASSWORD_TOO_SHORT)
  .max(200, ERROR_MESSAGES.ADMIN_PASSWORD_TOO_LONG);

export const loginSchema = z.object({
  email: emailSchema,
  password: currentPassword,
  next: z.string().max(200).optional(),
});
export type LoginInput = z.input<typeof loginSchema>;

export const verify2faSchema = z.object({
  code: z.string().trim().min(6, ERROR_MESSAGES.ADMIN_MFA_INVALID).max(32),
  mode: z.enum(['totp', 'recovery']).default('totp'),
});
export type Verify2faInput = z.input<typeof verify2faSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(200),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: ERROR_MESSAGES.ADMIN_PASSWORD_MISMATCH,
  });
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword,
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: ERROR_MESSAGES.ADMIN_PASSWORD_MISMATCH,
  });
export type PasswordChangeInput = z.input<typeof passwordChangeSchema>;

export const disable2faSchema = z.object({
  password: currentPassword,
});
export type Disable2faInput = z.input<typeof disable2faSchema>;

export const confirm2faSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, ERROR_MESSAGES.ADMIN_MFA_INVALID),
});
export type Confirm2faInput = z.input<typeof confirm2faSchema>;
