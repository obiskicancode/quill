import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { setAccessCookie } from '@/lib/booking/session';
import { buildSnapshot } from '@/lib/booking/snapshot';
import {
  createReference,
  insertReservation,
  toReservationResponse,
} from '@/lib/booking/store';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { getCheckoutSettings } from '@/lib/checkout/settings';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp } from '@/lib/http/request';
import { rateLimit } from '@/lib/rate-limit';
import { getRoomDetail } from '@/lib/rooms/detail';
import {
  fieldErrorsFrom,
  reservationRequestSchema,
} from '@/schemas/checkout.schema';
import type { ApiError, ReservationResponse } from '@/types/checkout.types';

const fail = (
  status: number,
  error: ApiError,
  headers?: Record<string, string>,
) => apiFail(status, error.message, error, { noCache: true, headers });

/**
 * Creates the pending reservation and starts the hold. Safe to retry: the same idempotency key always returns
 * the same reservation, so a dropped connection can never create two.
 */
export async function POST(req: Request) {
  const client = clientIp(req) ?? 'local';
  if (!(await rateLimit(client, 10, 60_000)).allowed) {
    return fail(
      429,
      {
        code: ERROR_CODES.RATE_LIMITED,
        message: ERROR_MESSAGES.BOOKING_RATE_LIMITED,
      },
      { 'Retry-After': '60' },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = reservationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(422, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.SOME_DETAILS_NEED_FIXING,
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  }
  const data = parsed.data;
  if (data.website)
    return fail(400, {
      code: ERROR_CODES.REJECTED,
      message: ERROR_MESSAGES.REQUEST_REJECTED,
    });

  const idKey = `res:${data.idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response) {
    const replay = apiOk(previous.response as ReservationResponse);
    setAccessCookie(
      replay,
      (previous.response as ReservationResponse).reference,
      'checkout',
    );
    return replay;
  }

  const quote = await buildCheckoutQuote({
    room: data.room,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    adults: data.adults,
    children: data.children,
    extraBed: data.extraBed,
    extras: data.extras,
  });
  if (quote.status === 'unavailable')
    return fail(409, {
      code: ERROR_CODES.UNAVAILABLE,
      message: ERROR_MESSAGES.ROOM_UNAVAILABLE_DATES,
      quote,
    });
  if (quote.status === 'invalid')
    return fail(409, { code: ERROR_CODES.VALIDATION, message: quote.message });
  if (quote.breakdown.totalMinor !== data.expectedTotalMinor) {
    return fail(409, {
      code: ERROR_CODES.PRICE_CHANGED,
      message: ERROR_MESSAGES.PRICE_CHANGED,
      quote,
    });
  }

  const room = await getRoomDetail(data.room);
  if (!room)
    return fail(409, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.ROOM_UNAVAILABLE,
    });
  const settings = await getCheckoutSettings();
  const guest = {
    fullName: data.guest.fullName,
    email: data.guest.email,
    phone: data.guest.phone,
    country: data.guest.country,
    arrivalTime: data.guest.arrivalTime,
    specialRequests: data.guest.specialRequests,
  };
  const snapshot = await buildSnapshot(room, quote, settings);
  const reservation = await insertReservation({
    reference: createReference(),
    roomSlug: data.room,
    stay: {
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: data.adults,
      children: data.children,
      extraBed: data.extraBed,
    },
    extras: data.extras,
    quote,
    settings,
    guest,
    snapshot,
  });
  if (!reservation)
    return fail(409, {
      code: ERROR_CODES.UNAVAILABLE,
      message: ERROR_MESSAGES.ROOM_UNAVAILABLE_DATES,
    });

  const response = toReservationResponse(reservation);
  await setIdempotency(idKey, response, 201, 60, {
    reservationId: reservation.id,
    method: 'POST',
    path: '/api/reservations',
  });
  const created = apiOk(response, { status: 201 });
  setAccessCookie(created, reservation.reference, 'checkout');
  return created;
}
