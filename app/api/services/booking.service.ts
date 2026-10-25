import type { VerifyRequest } from '@/schemas/booking.schema';
import type { GuestReservation, ResendResponse } from '@/types/booking.types';
import type { StatusResponse } from '@/types/checkout.types';

import BaseService from './base.service';

const enc = encodeURIComponent;
/** Typed fetch helpers for the confirmation page. Every call here is a read or a rate-limited, repeat-safe action. */
class BookingService extends BaseService {
  constructor() {
    super('/reservations');
  }

  get(reference: string) {
    return this.httpGet<GuestReservation>(`/${enc(reference)}`);
  }

  status(reference: string) {
    return this.httpGet<StatusResponse>(`/${enc(reference)}/status`);
  }

  verify(body: VerifyRequest) {
    return this.httpPost<VerifyRequest, GuestReservation>('/verify', body);
  }

  resend(reference: string) {
    return this.httpPost<undefined, ResendResponse>(
      `/${enc(reference)}/resend-confirmation`,
      undefined,
    );
  }

  /** Builds the "Add to calendar" URL. Not an HTTP call. */
  calendarUrl(reference: string): string {
    return `/api/reservations/${enc(reference)}/calendar`;
  }
}

export const bookingService = new BookingService();
