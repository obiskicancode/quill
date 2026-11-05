import type {
  HoldUpdateInput,
  ReservationRequestInput,
} from '@/schemas/checkout.schema';
import type {
  CheckoutQuoteResponse,
  PaymentInitRequest,
  PaymentInitResponse,
  QuoteRequest,
  ReservationResponse,
  StatusResponse,
} from '@/types/checkout.types';

import BaseService from './base.service';

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
    return this.httpPost<ReservationRequestInput, ReservationResponse>(
      '/reservations',
      body,
    );
  }

  updateHold(reference: string, body: HoldUpdateInput) {
    return this.httpPatch<HoldUpdateInput, ReservationResponse>(
      `/reservations/${enc(reference)}`,
      body,
    );
  }

  initPayment(body: PaymentInitRequest) {
    return this.httpPost<PaymentInitRequest, PaymentInitResponse>(
      '/payments/initialize',
      body,
    );
  }

  status(reference: string) {
    return this.httpGet<StatusResponse>(
      `/reservations/${enc(reference)}/status`,
    );
  }

  uploadProof(reference: string, file: File) {
    const form = new FormData();
    form.set('file', file);
    return this.httpPost<FormData, StatusResponse>(
      `/reservations/${enc(reference)}/transfer-proof`,
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
  }
}

export const checkoutService = new CheckoutService();

/** A fresh idempotency key, so retries and double-clicks never create two bookings. */
export const newKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k${Date.now()}${Math.random().toString(36).slice(2)}`;
