import { apiFail, apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { commitChange } from '@/lib/manage/actions';
import {
  manageError,
  manageOpts,
  replayKey,
  requireManage,
} from '@/lib/manage/auth';
import { hotelClock } from '@/lib/stay-quote';
import { fieldErrorsFrom } from '@/schemas/checkout.schema';
import { changeDatesRequestSchema } from '@/schemas/manage.schema';

/**
 * Confirms the new dates from a quote. Re-checks the rules, availability and price on the server. If more must be paid
 * it returns payment_required and holds the new dates while the old dates stay valid; the guest then pays through
 * the same payment endpoint as checkout. Idempotent: a repeat with the same key changes nothing.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const auth = await requireManage(req, reference);
  if (!auth.ok) return auth.res;

  const parsed = changeDatesRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return manageError(422, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.REQUEST_MISSING_DETAILS,
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  const { idempotencyKey, quoteId } = parsed.data;

  const r = await loadReservation(reference);
  if (!r)
    return manageError(404, {
      code: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.BOOKING_NOT_FOUND,
    });
  const opts = await manageOpts(reference);
  const respond = async (status: 'completed' | 'payment_required') =>
    apiOk(
      {
        status,
        view: await buildGuestReservation(r, 'verified', { manage: opts }),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );

  const key = replayKey('chg', idempotencyKey);
  const earlier = await getIdempotencyRecord(key);
  if (earlier?.response)
    return respond(
      (earlier.response as { status: 'completed' | 'payment_required' }).status,
    );

  const outcome = await commitChange(r, quoteId, hotelClock());
  if (outcome.status === 'not_allowed')
    return manageError(409, {
      code: ERROR_CODES.NOT_ALLOWED,
      message: outcome.reason,
    });
  if (outcome.status === 'stale')
    return apiFail(
      409,
      ERROR_MESSAGES.QUOTE_STALE,
      { code: ERROR_CODES.QUOTE_STALE, quote: outcome.quote },
      { headers: { 'Cache-Control': 'no-store' } },
    );

  await setIdempotency(key, { status: outcome.status }, 200, 60, {
    reservationId: r.id,
    method: 'POST',
    path: '/api/reservations/change-dates',
  });
  return respond(outcome.status);
}
