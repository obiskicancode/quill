import { z } from 'zod';

export const StaffInviteInputSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required').max(100),
  lastName: z.string().trim().min(2, 'Last name is required').max(100),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  role: z.enum(['reception', 'manager', 'owner']),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
});

export type StaffInviteInput = z.infer<typeof StaffInviteInputSchema>;

export const StaffUpdateInputSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required').max(100),
  lastName: z.string().trim().min(2, 'Last name is required').max(100),
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
    password: z.string().min(1, 'Password is required').optional(),
    totpCode: z
      .string()
      .regex(/^\d{6}$/, 'Enter 6-digit verification code')
      .optional(),
  })
  .refine((data) => data.password || data.totpCode, {
    message: 'Password or 2FA code is required for step-up verification',
  });

export type StepUpAuthInput = z.infer<typeof StepUpAuthInputSchema>;
