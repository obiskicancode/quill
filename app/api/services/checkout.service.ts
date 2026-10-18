import BaseService from './base.service';

import { config } from '@/config';

import type { ReservationRequestInput } from '@/schemas/checkout.schema';
import type {
  CheckoutQuoteResponse, PaymentInitRequest, PaymentInitResponse, QuoteRequest, ReservationResponse, StatusResponse,
} from '@/types/checkout.types';

const enc = encodeURIComponent;

/** Typed fetch helpers for checkout. A network failure surfaces as ServiceError with network: true. */
class CheckoutService extends BaseService {
  constructor() {
    super('');
  }

  quote(body: QuoteRequest) {
    return this.httpPost<QuoteRequest, CheckoutQuoteResponse>('/quote', body);
  }

  createReservation(body: ReservationRequestInput) {
    return this.httpPost<ReservationRequestInput, ReservationResponse>('/reservations', body);
  }

  initPayment(body: PaymentInitRequest) {
    return this.httpPost<PaymentInitRequest, PaymentInitResponse>('/payments/initialize', body);
  }

  status(reference: string) {
    return this.httpGet<StatusResponse>(`/reservations/${enc(reference)}/status`);
  }

  uploadProof(reference: string, file: File) {
    const form = new FormData();
    form.set('file', file);
    return this.httpPost<FormData, StatusResponse>(`/reservations/${enc(reference)}/transfer-proof`, form);
  }
}

export const checkoutService = new CheckoutService();

/** A fresh idempotency key, so retries and double-clicks never create two bookings. */
export const newKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`;

const PROVIDER_SCRIPTS = {
  paystack: 'https://js.paystack.co/v2/inline.js',
  flutterwave: 'https://checkout.flutterwave.com/v3.js',
  stripe: 'https://js.stripe.com/v3/',
} as const;

/**
 * Loads the provider's script only when the guest picks Card or USSD, and only if you opted into popup checkout
 * (NEXT_PUBLIC_PAYMENT_POPUP=1). The default hosted-redirect flow needs no script at all.
 */
export function loadProviderScript(provider: keyof typeof PROVIDER_SCRIPTS): void {
  if (!config.PAYMENT.POPUP) return
  const src = PROVIDER_SCRIPTS[provider]
  if (document.querySelector(`script[src="${src}"]`)) return
  const s = document.createElement('script')
  s.src = src
  s.async = true
  document.head.appendChild(s)
}
