import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { matchesRequestedStay } from '@/lib/booking/recovery';
import { loadPendingReservations } from '@/lib/booking/view';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { fieldErrorsFrom, quoteRequestSchema } from '@/schemas/checkout.schema';
import type { ApiError } from '@/types/checkout.types';

/** Server-calculated breakdown, availability, hold requirements and policy summary. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.CHECK_STAY_DETAILS,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
    return apiFail(422, error.message, error);
  }
  try {
    // A hold the guest already has must not make their own stay look sold out. The
    // request never names a reservation; this comes from their signed cookies.
    const ownHold = (await loadPendingReservations()).find((r) =>
      matchesRequestedStay(r, {
        roomSlug: parsed.data.room,
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
        adults: parsed.data.adults,
        children: parsed.data.children,
      }),
    );
    const quote = await buildCheckoutQuote({
      ...parsed.data,
      extras: parsed.data.extras,
      excludeReservationId: ownHold?.id,
    });
    return apiOk(quote, { noCache: true });
  } catch {
    const error: ApiError = {
      code: ERROR_CODES.SERVER,
      message: ERROR_MESSAGES.PRICE_CALCULATION_FAILED,
    };
    return apiFail(503, error.message, error);
  }
}
