import type {
  ManualRefundPayoutInput as ManualRefundPayoutInputSchema,
  PaymentsQueryParams as PaymentsQueryParamsSchema,
  ReconcileBulkInput as ReconcileBulkInputSchema,
  UnreconcileInput as UnreconcileInputSchema,
  WebhookEventsQueryParams as WebhookEventsQueryParamsSchema,
} from '@/schemas/payments-admin.schema';

export type PaymentsQueryParams = PaymentsQueryParamsSchema;

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

export type ReconcileBulkInput = ReconcileBulkInputSchema;
export type UnreconcileInput = UnreconcileInputSchema;
export type ManualRefundPayoutInput = ManualRefundPayoutInputSchema;

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

export type WebhookEventsQueryParams = WebhookEventsQueryParamsSchema;

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
