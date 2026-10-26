import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { hotelClock } from '@/lib/dates';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { apiOk } from '@/lib/http/envelope';
import { cancelBooking } from '@/lib/manage/actions';
import {
  manageError,
  manageOpts,
  replayKey,
  requireManage,
} from '@/lib/manage/auth';
import { fieldErrorsFrom } from '@/schemas/checkout.schema';
import { cancelRequestSchema } from '@/schemas/manage.schema';

/**
 * Cancels the booking. Needs the manage session, CSRF token and an idempotency key: sending it twice
 * (a double click, a retry after a dropped connection) cancels once and refunds once.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const auth = await requireManage(req, reference);
  if (!auth.ok) return auth.res;

  const parsed = cancelRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return manageError(422, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.CHECK_FORM,
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  const body = parsed.data;

  const r = await loadReservation(reference);
  if (!r)
    return manageError(404, {
      code: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.BOOKING_NOT_FOUND,
    });
  const opts = await manageOpts(reference);
  const done = async () =>
    apiOk(await buildGuestReservation(r, 'verified', { manage: opts }), {
      noCache: true,
    });

  const key = replayKey('cancel', body.idempotencyKey);
  const previous = await getIdempotencyRecord(key);
  if (previous?.reservationId === r.id) return done(); // replay: nothing is repeated

  const outcome = await cancelBooking(r, body, hotelClock());
  if (outcome.status === 'not_allowed')
    return manageError(409, {
      code: ERROR_CODES.NOT_ALLOWED,
      message: outcome.reason,
    });
  if (outcome.status === 'preview_changed')
    return manageError(409, {
      code: ERROR_CODES.PREVIEW_CHANGED,
      message: ERROR_MESSAGES.REFUND_PREVIEW_CHANGED,
      preview: outcome.preview,
    });

  await setIdempotency(key, { ok: true }, 200, 60, {
    reservationId: r.id,
    method: 'POST',
    path: '/api/reservations/cancel',
  });
  return done();
}
