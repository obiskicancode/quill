import { ERROR_CODES } from '@/constants/error-codes';
import type { PaymentProvider } from '@/types/checkout.types';

export interface PaymentInitialization {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializedPayment {
  redirectUrl: string;
}

export interface PaymentWebhookInput {
  rawBody: string;
  headers: Headers;
}

export type PaymentWebhookStatus = 'paid' | 'failed' | 'ignored';

export interface PaymentWebhookEvent {
  eventId: string;
  type: string;
  status: PaymentWebhookStatus;
  reference: string;
  amountMinor: number;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}

export type WebhookVerification =
  | { ok: true; event: PaymentWebhookEvent }
  | {
      ok: false;
      reason:
        | typeof ERROR_CODES.WEBHOOK_INVALID_SIGNATURE
        | typeof ERROR_CODES.WEBHOOK_INVALID_PAYLOAD;
    };

export interface PaymentRefundInput {
  reference: string;
  amountMinor: number;
}

/** Every online payment provider implements this contract. Add a provider by registering a factory. */
export interface PaymentProviderAdapter {
  readonly id: PaymentProvider;
  readonly label: string;
  isConfigured(): boolean;
  initialize(input: PaymentInitialization): Promise<InitializedPayment>;
  verifyWebhook(input: PaymentWebhookInput): Promise<WebhookVerification>;
  refund(input: PaymentRefundInput): Promise<boolean>;
}

export type PaymentProviderFactory = () => PaymentProviderAdapter;

export const PAYMENT_PROVIDER_IDS: readonly PaymentProvider[] = [
  'paystack',
  'flutterwave',
  'stripe',
];

export function isPaymentProviderId(value: string): value is PaymentProvider {
  return (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value);
}
