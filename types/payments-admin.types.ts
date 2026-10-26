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

export interface PaymentSummaryDelta {
  collectedPercent: number;
  refundsPercent: number;
  collectedChangeMinor: number;
  refundsChangeMinor: number;
}

export interface PaymentSummaryResponse {
  range: { from: string; to: string; label: string };
  collectedMinor: number;
  refundsMinor: number;
  netRevenueMinor: number;
  pendingTransfersCount: number;
  pendingTransfersMinor: number;
  failedCount: number;
  awaitingReconciledCount: number;
  awaitingReconciledMinor: number;
  delta: PaymentSummaryDelta;
}

export interface PaymentBreakdownItem {
  key: string;
  label: string;
  count: number;
  amountMinor: number;
  percent: number;
}

export interface DailyPaymentStripItem {
  date: string;
  label: string;
  collectedMinor: number;
  count: number;
}

export interface PaymentsBreakdownResponse {
  byMethod: PaymentBreakdownItem[];
  byProvider: PaymentBreakdownItem[];
  dailyStrip: DailyPaymentStripItem[];
}

export interface PaymentListItem {
  id: string;
  reference: string;
  reservationId: string;
  reservationRef: string;
  guestName: string;
  guestEmail: string;
  type: 'deposit' | 'balance' | 'full' | 'refund';
  provider: 'paystack' | 'flutterwave' | 'stripe' | 'bank_transfer' | 'cash';
  method: 'card' | 'ussd' | 'bank_transfer' | 'cash';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amountMinor: number;
  feeMinor: number;
  netAmountMinor: number;
  currency: string;
  providerRef: string | null;
  reconciled: boolean;
  reconciledAt: string | null;
  reconciledBy: string | null;
  reconciledByName: string | null;
  note: string | null;
  proofUrl: string | null;
  failureReason: string | null;
  idempotencyKey: string;
  recordedBy: string | null;
  recordedByName: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReservationSummary {
  id: string;
  reference: string;
  guestName: string;
  guestEmail: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: string;
  totalMinor: number;
  amountPaidMinor: number;
  amountRefundedMinor: number;
}

export interface PaymentWebhookSummary {
  id: string;
  provider: string;
  eventId: string;
  eventType: string | null;
  receivedAt: string;
  processed: boolean;
  processedAt: string | null;
}

export interface PaymentDetailResponse extends PaymentListItem {
  reservation: PaymentReservationSummary;
  webhooks: PaymentWebhookSummary[];
  rawGatewayResponse?: Record<string, unknown> | null;
}

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

export interface ManualRefundItem {
  id: string;
  reference: string;
  reservationId: string;
  reservationRef: string;
  guestName: string;
  guestEmail: string;
  amountMinor: number;
  refundDueMinor: number;
  provider: 'paystack' | 'flutterwave' | 'stripe' | 'bank_transfer' | 'cash';
  method: 'card' | 'bank_transfer' | 'cash';
  status: 'pending' | 'paid' | 'failed';
  providerState?: string | null;
  idempotencyKey: string;
  createdAt: string;
}

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

export interface WebhookEventItem {
  id: string;
  provider: 'paystack' | 'flutterwave' | 'stripe' | 'bank_transfer' | 'cash';
  eventId: string;
  eventType: string | null;
  receivedAt: string;
  processed: boolean;
  processedAt: string | null;
  isOverdue: boolean; // unprocessed for > 10m
  payloadMasked?: Record<string, unknown>;
}
