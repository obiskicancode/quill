/**
 * Provider-agnostic payment contracts. Adapters translate these types to each
 * gateway; amounts are always integer minor units and signature verification is
 * owned by the adapter rather than this shared layer.
 */
import { ERROR_CODES } from '@/constants/error-codes';
import type { PaymentProvider } from '@/types/checkout.types';

/** Input for opening a hosted checkout for a reservation. */
export interface PaymentInitialization {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

/** Where the guest should be redirected to complete payment. */
export interface InitializedPayment {
  redirectUrl: string;
}

/** Raw webhook request; the adapter verifies the signature against `rawBody`. */
export interface PaymentWebhookInput {
  rawBody: string;
  headers: Headers;
}

/** Normalized outcome of a webhook event. */
export type PaymentWebhookStatus = 'paid' | 'failed' | 'ignored';

/** Provider-independent webhook event used by the shared pipeline. */
export interface PaymentWebhookEvent {
  eventId: string;
  type: string;
  status: PaymentWebhookStatus;
  reference: string;
  amountMinor: number;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}

/** Result of verifying and parsing a provider webhook. */
export type WebhookVerification =
  | { ok: true; event: PaymentWebhookEvent }
  | {
      ok: false;
      reason:
        | typeof ERROR_CODES.WEBHOOK_INVALID_SIGNATURE
        | typeof ERROR_CODES.WEBHOOK_INVALID_PAYLOAD;
    };

/** Refund request sent to a provider for the original transaction reference. */
export interface PaymentRefundInput {
  reference: string;
  amountMinor: number;
}

/** Normalized provider response when re-checking a transaction. */
export interface PaymentVerificationResult {
  status: 'paid' | 'failed' | 'pending';
  amountMinor: number;
  payload?: Record<string, unknown>;
}

/** Every online payment provider implements this contract. Add a provider by registering a factory. */
export interface PaymentProviderAdapter {
  readonly id: PaymentProvider;
  readonly label: string;
  isConfigured(): boolean;
  initialize(input: PaymentInitialization): Promise<InitializedPayment>;
  verifyWebhook(input: PaymentWebhookInput): Promise<WebhookVerification>;
  refund(input: PaymentRefundInput): Promise<boolean>;
  verifyTransaction?(
    reference: string,
  ): Promise<PaymentVerificationResult | null>;
}

/** Creates a provider adapter; register one factory per provider id. */
export type PaymentProviderFactory = () => PaymentProviderAdapter;

/** Online providers the app knows how to construct. */
export const PAYMENT_PROVIDER_IDS: readonly PaymentProvider[] = [
  'paystack',
  'flutterwave',
  'stripe',
];

/** Narrows an arbitrary string to a supported online provider id. */
export function isPaymentProviderId(value: string): value is PaymentProvider {
  return (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value);
}
