import { apiOk } from '@/app/api/envelope';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { store } from '@/lib/checkout/mock-db';
import { cancelBooking } from '@/lib/manage/actions';
import {
  manageError,
  manageOpts,
  replayKey,
  requireManage,
} from '@/lib/manage/auth';
import { hotelClock } from '@/lib/stay-quote';
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
  const demo = new URL(req.url).searchParams.get('demo');
  const auth = await requireManage(req, reference, demo);
  if (!auth.ok) return auth.res;

  const parsed = cancelRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return manageError(422, {
      code: 'validation',
      message: 'Please check the form.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  const body = parsed.data;

  const r = await loadReservation(reference, demo);
  if (!r)
    return manageError(404, {
      code: 'not_found',
      message: 'Booking not found.',
    });
  const opts = await manageOpts(reference);
  const done = () =>
    apiOk(buildGuestReservation(r, 'verified', { manage: opts }), {
      headers: { 'Cache-Control': 'no-store' },
    });

  const key = replayKey('cancel', body.idempotencyKey);
  if (store.idempotency.get(key) === reference) return done(); // replay: nothing is repeated

  const demos = new Set((demo ?? '').split(',').map((t) => t.trim()));
  const outcome = cancelBooking(r, body, hotelClock(), demos);
  if (outcome.status === 'not_allowed')
    return manageError(409, { code: 'not_allowed', message: outcome.reason });
  if (outcome.status === 'preview_changed')
    return manageError(409, {
      code: 'preview_changed',
      message: 'The refund amount has changed. Please review it.',
      preview: outcome.preview,
    });

  store.idempotency.set(key, reference);
  // Preview switch: the first attempt "loses the connection" after the cancellation was saved. The retry must not repeat it.
  if (demos.has('cancelerror') && !store.failedOnce.has(key)) {
    store.failedOnce.add(key);
    return manageError(503, {
      code: 'server',
      message: 'The connection dropped.',
    });
  }
  return done();
}
