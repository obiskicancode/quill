import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { getAccess } from '@/lib/booking/session';
import {
  toReservationResponse,
  updateReservationHold,
} from '@/lib/booking/store';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { manageOpts } from '@/lib/manage/auth';
import { fieldErrorsFrom, holdUpdateSchema } from '@/schemas/checkout.schema';
import type { BookingApiError } from '@/types/booking.types';
import type { ApiError } from '@/types/checkout.types';

const deny = () => {
  const error: BookingApiError = {
    code: ERROR_CODES.UNAUTHORIZED,
    message: ERROR_MESSAGES.VERIFY_BOOKING_TO_VIEW,
  };
  return apiFail(401, error.message, error, {
    noCache: true,
  });
};

/** The guest-visible reservation. Needs the signed cookie; email and phone are masked unless the guest verified. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const level = await getAccess(reference);
  if (!level) return deny();
  // A manage session adds the allowed actions, activity timeline and CSRF token.
  const manage = await manageOpts(reference);
  try {
    const reservation = await loadReservation(reference);
    if (!reservation) return deny(); // unknown references look exactly like missing access
    return apiOk(await buildGuestReservation(reservation, level, { manage }), {
      noCache: true,
    });
  } catch {
    const error: BookingApiError = {
      code: ERROR_CODES.SERVER,
      message: ERROR_MESSAGES.BOOKING_LOAD_FAILED,
    };
    return apiFail(503, error.message, error);
  }
}

const fail = (status: number, error: ApiError) =>
  apiFail(status, error.message, error, { noCache: true });

/** Edits a live checkout hold: guest details, extras and the extra bed. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  if (!(await getAccess(reference))) return deny();

  const parsed = holdUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(422, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.SOME_DETAILS_NEED_FIXING,
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  }
  const data = parsed.data;
  if (data.website) {
    return fail(400, {
      code: ERROR_CODES.REJECTED,
      message: ERROR_MESSAGES.REQUEST_REJECTED,
    });
  }

  const reservation = await loadReservation(reference);
  if (!reservation) return deny();
  if (reservation.status === 'expired') {
    return fail(409, {
      code: ERROR_CODES.HOLD_EXPIRED,
      message: ERROR_MESSAGES.HOLD_EXPIRED,
    });
  }
  if (
    !['pending_payment', 'awaiting_transfer', 'payment_failed'].includes(
      reservation.status,
    ) ||
    reservation.proof !== null ||
    reservation.paidMinor > 0
  ) {
    return fail(409, {
      code: ERROR_CODES.NOT_ALLOWED,
      message: ERROR_MESSAGES.HOLD_NOT_EDITABLE,
    });
  }

  const quote = await buildCheckoutQuote({
    room: reservation.roomSlug,
    checkIn: reservation.stay.checkIn,
    checkOut: reservation.stay.checkOut,
    adults: reservation.stay.adults,
    children: reservation.stay.children,
    extraBed: data.extraBed,
    extras: data.extras,
    excludeReservationId: reservation.id,
  });
  if (quote.status === 'unavailable') {
    return fail(409, {
      code: ERROR_CODES.UNAVAILABLE,
      message: ERROR_MESSAGES.ROOM_UNAVAILABLE_DATES,
      quote,
    });
  }
  if (quote.status === 'invalid') {
    return fail(409, {
      code: ERROR_CODES.VALIDATION,
      message: quote.message,
    });
  }
  if (quote.breakdown.totalMinor !== data.expectedTotalMinor) {
    return fail(409, {
      code: ERROR_CODES.PRICE_CHANGED,
      message: ERROR_MESSAGES.PRICE_CHANGED,
      quote,
    });
  }

  const result = await updateReservationHold({
    reference,
    guest: {
      fullName: data.guest.fullName,
      email: data.guest.email,
      phone: data.guest.phone,
      country: data.guest.country,
      arrivalTime: data.guest.arrivalTime,
      specialRequests: data.guest.specialRequests,
    },
    extraBed: data.extraBed,
    quote,
  });
  if (result.outcome === 'not_found') return deny();
  if (result.outcome === 'hold_expired') {
    return fail(409, {
      code: ERROR_CODES.HOLD_EXPIRED,
      message: ERROR_MESSAGES.HOLD_EXPIRED,
    });
  }
  if (result.outcome === 'not_allowed' || !result.reservation) {
    return fail(409, {
      code: ERROR_CODES.NOT_ALLOWED,
      message: ERROR_MESSAGES.HOLD_NOT_EDITABLE,
    });
  }
  return apiOk(toReservationResponse(result.reservation), { noCache: true });
}
