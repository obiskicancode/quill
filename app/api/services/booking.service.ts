import type { VerifyRequest } from '@/schemas/booking.schema';
import type { GuestReservation, ResendResponse } from '@/types/booking.types';
import type { StatusResponse } from '@/types/checkout.types';

import BaseService from './base.service';

const enc = encodeURIComponent;
const demoParams = (demo: string | null) =>
  demo ? { params: { demo } } : undefined;

/** Typed fetch helpers for the confirmation page. Every call here is a read or a rate-limited, repeat-safe action. */
class BookingService extends BaseService {
  constructor() {
    super('/reservations');
  }

  get(reference: string, demo: string | null) {
    return this.httpGet<GuestReservation>(
      `/${enc(reference)}`,
      demoParams(demo),
    );
  }

  status(reference: string, demo: string | null) {
    return this.httpGet<StatusResponse>(
      `/${enc(reference)}/status`,
      demoParams(demo),
    );
  }

  verify(body: VerifyRequest) {
    return this.httpPost<VerifyRequest, GuestReservation>('/verify', body);
  }

  resend(reference: string, demo: string | null) {
    return this.httpPost<undefined, ResendResponse>(
      `/${enc(reference)}/resend-confirmation`,
      undefined,
      demoParams(demo),
    );
  }

  /** Builds the "Add to calendar" URL. Not an HTTP call. */
  calendarUrl(reference: string, demo: string | null): string {
    const url = `/api/reservations/${enc(reference)}/calendar`;
    return demo ? `${url}?demo=${enc(demo)}` : url;
  }
}

export const bookingService = new BookingService();
