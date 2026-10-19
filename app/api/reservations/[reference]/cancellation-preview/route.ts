import { apiOk } from '@/app/api/envelope';
import { isDemoRef, loadReservation } from '@/lib/booking/view';
import { parseDemos } from '@/lib/checkout/settings';
import { manageError, manageOpts } from '@/lib/manage/auth';
import { allowedActions, previewCancellation } from '@/lib/manage/rules';
import { getManageSettings } from '@/lib/manage/settings';
import { hotelClock } from '@/lib/stay-quote';

/** What cancelling right now would do: refund, amount kept, the policy rule applied, the method and the expected wait. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const demo = new URL(req.url).searchParams.get('demo');
  if (!(await manageOpts(reference)))
    return manageError(401, {
      code: 'session_expired',
      message: 'Your session has ended. Please verify again.',
    });
  const r = await loadReservation(reference, demo);
  if (!r)
    return manageError(404, {
      code: 'not_found',
      message: 'Booking not found.',
    });

  if (isDemoRef(reference) && parseDemos(demo).has('previewerror'))
    return manageError(503, {
      code: 'server',
      message: "We couldn't work out your refund.",
    });
  const settings = getManageSettings(parseDemos(r.demo));
  const clock = hotelClock();
  const allowed = allowedActions(r, clock, settings).canCancel;
  if (!allowed.allowed)
    return manageError(409, {
      code: 'not_allowed',
      message: allowed.reason ?? 'This booking cannot be cancelled online.',
    });
  return apiOk(previewCancellation(r, clock, settings), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
