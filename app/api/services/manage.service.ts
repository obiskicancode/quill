import BaseService from './base.service';

import type { CancelRequest, DetailsRequest } from '@/schemas/manage.schema';
import type { GuestReservation } from '@/types/booking.types';
import type { PaymentInitResponse } from '@/types/checkout.types';
import type { CancellationPreview, ChangeQuoteRequest, ChangeQuoteResponse } from '@/types/manage.types';

const enc = encodeURIComponent;
const demoParams = (demo: string | null) => (demo ? { params: { demo } } : undefined);

interface ChangeDatesResponse {
  status: 'completed' | 'payment_required';
  view: GuestReservation;
}

/** Typed fetch helpers for the manage page. Every change sends the CSRF token and an idempotency key, so retries are safe. */
class ManageService extends BaseService {
  constructor() {
    super('/reservations');
  }

  private withCsrf(csrf: string, demo: string | null) {
    return { headers: { 'X-CSRF-Token': csrf }, ...demoParams(demo) };
  }

  /** Reloads the booking with its manage data (allowed actions, timeline, CSRF token). */
  get(ref: string, demo: string | null) {
    return this.httpGet<GuestReservation>(`/${enc(ref)}`, { params: { manage: '1', ...(demo ? { demo } : {}) } });
  }

  cancellationPreview(ref: string, demo: string | null) {
    return this.httpGet<CancellationPreview>(`/${enc(ref)}/cancellation-preview`, demoParams(demo));
  }

  cancel(
    ref: string,
    body: Pick<CancelRequest, 'idempotencyKey' | 'reason' | 'note' | 'acknowledged' | 'expectedRefundMinor'>,
    csrf: string,
    demo: string | null,
  ) {
    return this.httpPost<typeof body, GuestReservation>(`/${enc(ref)}/cancel`, body, this.withCsrf(csrf, demo));
  }

  changeQuote(ref: string, body: ChangeQuoteRequest, csrf: string, demo: string | null) {
    return this.httpPost<ChangeQuoteRequest, ChangeQuoteResponse>(`/${enc(ref)}/change-quote`, body, this.withCsrf(csrf, demo));
  }

  changeDates(ref: string, body: { idempotencyKey: string; quoteId: string }, csrf: string, demo: string | null) {
    return this.httpPost<typeof body, ChangeDatesResponse>(`/${enc(ref)}/change-dates`, body, this.withCsrf(csrf, demo));
  }

  /** PATCH /details. Email is not accepted. */
  saveDetails(ref: string, body: DetailsRequest, csrf: string, demo: string | null) {
    return this.httpPatch<DetailsRequest, GuestReservation>(`/${enc(ref)}/details`, body, this.withCsrf(csrf, demo));
  }

  signOut(ref: string, csrf: string, demo: string | null) {
    return this.httpPost<undefined, { ok: true }>(`/${enc(ref)}/sign-out`, undefined, this.withCsrf(csrf, demo));
  }

  /** Pays the difference for a date change. Reuses the checkout payment endpoint. */
  initChangePayment(
    ref: string,
    body: { changeId: string; method: 'online' | 'bank_transfer'; idempotencyKey: string },
    csrf: string,
    demo: string | null,
  ) {
    return this.httpPost<Record<string, unknown>, PaymentInitResponse>('/payments/initialize', {
      reference: ref,
      purpose: 'change',
      demo,
      ...body,
    }, this.withCsrf(csrf, demo));
  }

  uploadChangeProof(ref: string, changeId: string, file: File, csrf: string, demo: string | null) {
    const form = new FormData();
    form.set('file', file);
    return this.httpPost<FormData, unknown>(`/${enc(ref)}/transfer-proof?change=${enc(changeId)}`, form, this.withCsrf(csrf, demo));
  }
}

export const manageService = new ManageService();
