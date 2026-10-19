import { apiOk } from '@/app/api/envelope';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { store } from '@/lib/checkout/mock-db';
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
  const demo = new URL(req.url).searchParams.get('demo');
  const auth = await requireManage(req, reference, demo);
  if (!auth.ok) return auth.res;

  const parsed = detailsRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return manageError(422, {
      code: 'validation',
      message: 'Some details need fixing.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    });

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

  const key = replayKey('det', parsed.data.idempotencyKey);
  if (store.idempotency.get(key) === reference) return done();

  const demos = new Set((demo ?? '').split(',').map((t) => t.trim()));
  const outcome = saveDetails(r, parsed.data.details, hotelClock(), demos);
  if (outcome.status === 'not_allowed')
    return manageError(409, { code: 'not_allowed', message: outcome.reason });
  store.idempotency.set(key, reference);
  if (demos.has('detailserror') && !store.failedOnce.has(key)) {
    store.failedOnce.add(key);
    return manageError(503, {
      code: 'server',
      message: 'The connection dropped.',
    });
  }
  return done();
}
