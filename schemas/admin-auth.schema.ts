import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';

export const adminEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, ERROR_MESSAGES.EMAIL_REQUIRED)
  .max(255, ERROR_MESSAGES.ADMIN_EMAIL_TOO_LONG)
  .email(ERROR_MESSAGES.EMAIL_INVALID);

const currentPassword = z
  .string()
  .min(1, ERROR_MESSAGES.ADMIN_CURRENT_PASSWORD_INVALID)
  .max(200, ERROR_MESSAGES.ADMIN_PASSWORD_TOO_LONG);

const newPassword = z
  .string()
  .min(1, ERROR_MESSAGES.ADMIN_PASSWORD_TOO_SHORT)
  .max(200, ERROR_MESSAGES.ADMIN_PASSWORD_TOO_LONG);

export const adminLoginSchema = z.object({
  email: adminEmailSchema,
  password: currentPassword,
  next: z.string().max(200).optional(),
});
export type AdminLoginInput = z.input<typeof adminLoginSchema>;

export const adminVerify2faSchema = z.object({
  code: z.string().trim().min(6, ERROR_MESSAGES.ADMIN_MFA_INVALID).max(32),
  mode: z.enum(['totp', 'recovery']).default('totp'),
});
export type AdminVerify2faInput = z.input<typeof adminVerify2faSchema>;

export const adminForgotPasswordSchema = z.object({
  email: adminEmailSchema,
});
export type AdminForgotPasswordInput = z.input<
  typeof adminForgotPasswordSchema
>;

export const adminResetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(200),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: ERROR_MESSAGES.ADMIN_PASSWORD_MISMATCH,
  });
export type AdminResetPasswordInput = z.input<typeof adminResetPasswordSchema>;

export const adminPasswordChangeSchema = z
  .object({
    currentPassword,
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: ERROR_MESSAGES.ADMIN_PASSWORD_MISMATCH,
  });
export type AdminPasswordChangeInput = z.input<
  typeof adminPasswordChangeSchema
>;

export const adminDisable2faSchema = z.object({
  password: currentPassword,
});
export type AdminDisable2faInput = z.input<typeof adminDisable2faSchema>;

export const adminConfirm2faSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, ERROR_MESSAGES.ADMIN_MFA_INVALID),
});
export type AdminConfirm2faInput = z.input<typeof adminConfirm2faSchema>;
