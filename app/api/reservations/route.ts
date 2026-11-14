import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { decideReplay, matchesRequestedStay } from '@/lib/booking/recovery';
import { setBookingAccessCookie } from '@/lib/booking/session';
import { buildSnapshot } from '@/lib/booking/snapshot';
import {
  createReference,
  createReservationWithIdempotency,
  loadStoredReservation,
  type CreateReservationOutcome,
} from '@/lib/booking/store';
import { loadPendingReservations } from '@/lib/booking/view';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { getCheckoutSettings } from '@/lib/checkout/settings';
import {
  getIdempotencyRecord,
  retireIdempotency,
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

function replayed(body: ReservationResponse) {
  const response = apiOk(body);
  setBookingAccessCookie(response, body.reference, 'checkout');
  return response;
}

/**
 * A replay only helps while the reservation it names can still be paid. The
 * idempotency record lives an hour and the hold fifteen minutes, so a body that
 * points at a dead booking is retired by the caller and this request continues as
 * if it had never been submitted.
 */
async function replayBody(
  response: unknown,
): Promise<ReservationResponse | null> {
  const body = response as ReservationResponse;
  if (typeof body?.reference !== 'string') return null;
  const stored = await loadStoredReservation(body.reference);
  return decideReplay(body, stored) === 'replay' ? body : null;
}

/**
 * Creates the pending reservation and starts the hold, in one commit with the idempotency record that replays it.
 * Safe to retry: the same idempotency key always returns the same reservation, so a dropped connection can never
 * create two — and can never leave a hold that its own retry is locked out of.
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
    const replay = await replayBody(previous.response);
    if (replay) return replayed(replay);
    await retireIdempotency(idKey);
  }

  // A hold this guest already has must not be the reason their own new booking is
  // refused. It is taken from their signed booking cookies, never from the request.
  const ownHold = (await loadPendingReservations()).find((r) =>
    matchesRequestedStay(r, {
      roomSlug: data.room,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: data.adults,
      children: data.children,
    }),
  );

  const quote = await buildCheckoutQuote({
    room: data.room,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    adults: data.adults,
    children: data.children,
    extraBed: data.extraBed,
    extras: data.extras,
    excludeReservationId: ownHold?.id,
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

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let outcome: CreateReservationOutcome;
    try {
      outcome = await createReservationWithIdempotency(
        {
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
          supersedeReservationId: ownHold?.id ?? null,
        },
        idKey,
        { method: 'POST', path: '/api/reservations' },
      );
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
        return fail(409, {
          code: ERROR_CODES.UNAVAILABLE,
          message: ERROR_MESSAGES.ROOM_UNAVAILABLE_DATES,
        });
      }
      // A colliding reference aborts the whole attempt, claim included, so the retry
      // below starts from a clean slate with a fresh reference.
      if (code === '23505' && attempt < 2) continue;
      throw error;
    }

    if ('replay' in outcome) return replayed(outcome.replay);
    if ('locked' in outcome)
      return fail(409, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.REQUEST_IN_PROGRESS,
      });
    if ('unavailable' in outcome)
      return fail(409, {
        code: ERROR_CODES.UNAVAILABLE,
        message: ERROR_MESSAGES.ROOM_UNAVAILABLE_DATES,
      });

    const created = apiOk(outcome.created, { status: 201 });
    setBookingAccessCookie(created, outcome.created.reference, 'checkout');
    return created;
  }

  throw new Error(ERROR_MESSAGES.RESERVATION_CREATION_RETRIES_EXHAUSTED);
}
