import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { setBookingAccessCookie } from '@/lib/booking/session';
import { buildSnapshot } from '@/lib/booking/snapshot';
import {
  createReference,
  insertReservation,
  toReservationResponse,
} from '@/lib/booking/store';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { getCheckoutSettings } from '@/lib/checkout/settings';
import {
  claimIdempotency,
  finishIdempotency,
  getIdempotencyRecord,
  releaseIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp } from '@/lib/http/request';
import { logStructured } from '@/lib/observability';
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

function pgErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

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
    setBookingAccessCookie(
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
  const claim = await claimIdempotency(idKey, 120, {
    method: 'POST',
    path: '/api/reservations',
  });
  if (!claim.claimed) {
    if (claim.record?.response) {
      const replay = apiOk(claim.record.response as ReservationResponse);
      setBookingAccessCookie(
        replay,
        (claim.record.response as ReservationResponse).reference,
        'checkout',
      );
      return replay;
    }
    return fail(409, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.REQUEST_IN_PROGRESS,
    });
  }

  try {
    let reservation: Awaited<ReturnType<typeof insertReservation>> = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        reservation = await insertReservation({
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
        break;
      } catch (error) {
        const code = pgErrorCode(error);
        if (code === '23P01') {
          logStructured(
            'reservation.inventory_conflict',
            {
              room: data.room,
              checkIn: data.checkIn,
              checkOut: data.checkOut,
              attempt,
            },
            'warn',
          );
          await releaseIdempotency(idKey);
          return fail(409, {
            code: ERROR_CODES.UNAVAILABLE,
            message: ERROR_MESSAGES.ROOM_UNAVAILABLE_DATES,
          });
        }
        if (code === '23505' && attempt < 2) continue;
        throw error;
      }
    }

    if (!reservation) {
      await releaseIdempotency(idKey);
      return fail(409, {
        code: ERROR_CODES.UNAVAILABLE,
        message: ERROR_MESSAGES.ROOM_UNAVAILABLE_DATES,
      });
    }

    const response = toReservationResponse(reservation);
    try {
      await finishIdempotency(idKey, response, 201, 60, {
        reservationId: reservation.id,
      });
    } catch (error) {
      logStructured(
        'reservation.idempotency_finish_failed',
        {
          reference: reservation.reference,
          error: error instanceof Error ? error.message : String(error),
        },
        'error',
      );
    }
    const created = apiOk(response, { status: 201 });
    setBookingAccessCookie(created, reservation.reference, 'checkout');
    return created;
  } catch (error) {
    await releaseIdempotency(idKey);
    throw error;
  }
}
