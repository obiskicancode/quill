import { apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { saveDetails } from '@/lib/manage/actions';
import {
  manageError,
  manageOpts,
  replayKey,
  requireManage,
} from '@/lib/manage/auth';
import { hotelClock } from '@/lib/stay-quote';
import { fieldErrorsFrom } from '@/schemas/checkout.schema';
import { detailsRequestSchema } from '@/schemas/manage.schema';

/** Updates name, phone, country, arrival time and special requests. The email cannot be changed here. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const auth = await requireManage(req, reference);
  if (!auth.ok) return auth.res;

  const parsed = detailsRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return manageError(422, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.SOME_DETAILS_NEED_FIXING,
      fieldErrors: fieldErrorsFrom(parsed.error),
    });

  const r = await loadReservation(reference);
  if (!r)
    return manageError(404, {
      code: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.BOOKING_NOT_FOUND,
    });
  const opts = await manageOpts(reference);
  const done = async () =>
    apiOk(await buildGuestReservation(r, 'verified', { manage: opts }), {
      headers: { 'Cache-Control': 'no-store' },
    });

  const key = replayKey('det', parsed.data.idempotencyKey);
  const previous = await getIdempotencyRecord(key);
  if (previous?.reservationId === r.id) return done();

  const outcome = await saveDetails(r, parsed.data.details, hotelClock());
  if (outcome.status === 'not_allowed')
    return manageError(409, {
      code: ERROR_CODES.NOT_ALLOWED,
      message: outcome.reason,
    });
  await setIdempotency(key, { ok: true }, 200, 60, {
    reservationId: r.id,
    method: 'PATCH',
    path: '/api/reservations/details',
  });
  return done();
}
