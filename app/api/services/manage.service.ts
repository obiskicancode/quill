import type { CancelRequest, DetailsRequest } from '@/schemas/manage.schema';
import type { GuestReservation } from '@/types/booking.types';
import type { PaymentInitResponse } from '@/types/checkout.types';
import type {
  CancellationPreview,
  ChangeQuoteRequest,
  ChangeQuoteResponse,
} from '@/types/manage.types';

import BaseService from './base.service';

const enc = encodeURIComponent;
interface ChangeDatesResponse {
  status: 'completed' | 'payment_required';
  view: GuestReservation;
}

/** Typed fetch helpers for the manage page. Every change sends the CSRF token and an idempotency key, so retries are safe. */
class ManageService extends BaseService {
  constructor() {
    super('/reservations');
  }

  private withCsrf(csrf: string) {
    return { headers: { 'X-CSRF-Token': csrf } };
  }

  /** Reloads the booking with its manage data (allowed actions, timeline, CSRF token). */
  get(ref: string) {
    return this.httpGet<GuestReservation>(`/${enc(ref)}`, {
      params: { manage: '1' },
    });
  }

  cancellationPreview(ref: string) {
    return this.httpGet<CancellationPreview>(
      `/${enc(ref)}/cancellation-preview`,
    );
  }

  cancel(
    ref: string,
    body: Pick<
      CancelRequest,
      | 'idempotencyKey'
      | 'reason'
      | 'note'
      | 'acknowledged'
      | 'expectedRefundMinor'
    >,
    csrf: string,
  ) {
    return this.httpPost<typeof body, GuestReservation>(
      `/${enc(ref)}/cancel`,
      body,
      this.withCsrf(csrf),
    );
  }

  changeQuote(ref: string, body: ChangeQuoteRequest, csrf: string) {
    return this.httpPost<ChangeQuoteRequest, ChangeQuoteResponse>(
      `/${enc(ref)}/change-quote`,
      body,
      this.withCsrf(csrf),
    );
  }

  changeDates(
    ref: string,
    body: { idempotencyKey: string; quoteId: string },
    csrf: string,
  ) {
    return this.httpPost<typeof body, ChangeDatesResponse>(
      `/${enc(ref)}/change-dates`,
      body,
      this.withCsrf(csrf),
    );
  }

  /** PATCH /details. Email is not accepted. */
  saveDetails(ref: string, body: DetailsRequest, csrf: string) {
    return this.httpPatch<DetailsRequest, GuestReservation>(
      `/${enc(ref)}/details`,
      body,
      this.withCsrf(csrf),
    );
  }

  signOut(ref: string, csrf: string) {
    return this.httpPost<undefined, { ok: true }>(
      `/${enc(ref)}/sign-out`,
      undefined,
      this.withCsrf(csrf),
    );
  }

  /** Pays the difference for a date change. Reuses the checkout payment endpoint. */
  initChangePayment(
    ref: string,
    body: {
      changeId: string;
      method: 'online' | 'bank_transfer';
      idempotencyKey: string;
    },
    csrf: string,
  ) {
    return this.httpPost<Record<string, unknown>, PaymentInitResponse>(
      '/payments/initialize',
      {
        reference: ref,
        purpose: 'change',
        ...body,
      },
      this.withCsrf(csrf),
    );
  }

  uploadChangeProof(ref: string, changeId: string, file: File, csrf: string) {
    const form = new FormData();
    form.set('file', file);
    return this.httpPost<FormData, unknown>(
      `/${enc(ref)}/transfer-proof?change=${enc(changeId)}`,
      form,
      this.withCsrf(csrf),
    );
  }
}

export const manageService = new ManageService();
