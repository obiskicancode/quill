import { z } from 'zod';

export const PaymentStatusFilter = z.enum([
  'all',
  'pending',
  'paid',
  'failed',
  'refunded',
]);

export const PaymentTypeFilter = z.enum([
  'all',
  'deposit',
  'balance',
  'full',
  'refund',
]);

export const PaymentProviderFilter = z.enum([
  'all',
  'paystack',
  'flutterwave',
  'stripe',
  'bank_transfer',
  'cash',
]);

export const PaymentMethodFilter = z.enum([
  'all',
  'card',
  'ussd',
  'bank_transfer',
  'cash',
]);

export const PaymentsQuerySchema = z.object({
  status: PaymentStatusFilter.default('all'),
  type: PaymentTypeFilter.default('all'),
  provider: PaymentProviderFilter.default('all'),
  method: PaymentMethodFilter.default('all'),
  dateField: z.enum(['paid', 'created']).default('created'),
  from: z.string().optional(),
  to: z.string().optional(),
  reconciled: z.enum(['all', 'yes', 'no']).default('all'),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  q: z.string().trim().optional(),
  sort: z
    .enum(['created_at', 'paid_at', 'amount_minor', 'reference'])
    .default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

export type PaymentsQueryParams = z.infer<typeof PaymentsQuerySchema>;

export const ReconcileBulkInputSchema = z.object({
  paymentIds: z.array(z.string().uuid()).min(1, 'Select at least one payment'),
  note: z.string().trim().max(500).optional(),
});

export type ReconcileBulkInput = z.infer<typeof ReconcileBulkInputSchema>;

export const UnreconcileInputSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Reason is required (min 5 characters)')
    .max(500),
});

export type UnreconcileInput = z.infer<typeof UnreconcileInputSchema>;

export const ManualRefundPayoutInputSchema = z.object({
  amountMinor: z.number().int().positive('Amount must be positive'),
  method: z.enum(['bank_transfer', 'cash']),
  reference: z.string().trim().min(3, 'Reference is required').max(100),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  idempotencyKey: z.string().min(10, 'Idempotency key is required'),
  doNotEmailGuest: z.boolean().default(false),
  note: z.string().trim().max(500).optional(),
});

export type ManualRefundPayoutInput = z.infer<
  typeof ManualRefundPayoutInputSchema
>;

export const WebhookEventsQuerySchema = z.object({
  provider: z
    .enum(['all', 'paystack', 'flutterwave', 'stripe', 'bank_transfer', 'cash'])
    .default('all'),
  processed: z.enum(['all', 'yes', 'no']).default('all'),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

export type WebhookEventsQueryParams = z.infer<typeof WebhookEventsQuerySchema>;
