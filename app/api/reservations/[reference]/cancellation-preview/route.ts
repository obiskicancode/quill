import { apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { loadReservation } from '@/lib/booking/view';
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
  if (!(await manageOpts(reference)))
    return manageError(401, {
      code: ERROR_CODES.SESSION_EXPIRED,
      message: ERROR_MESSAGES.SESSION_EXPIRED,
    });
  const r = await loadReservation(reference);
  if (!r)
    return manageError(404, {
      code: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.BOOKING_NOT_FOUND,
    });

  const settings = await getManageSettings();
  const clock = hotelClock();
  const allowed = allowedActions(r, clock, settings).canCancel;
  if (!allowed.allowed)
    return manageError(409, {
      code: ERROR_CODES.NOT_ALLOWED,
      message: allowed.reason ?? ERROR_MESSAGES.CANNOT_CANCEL_ONLINE,
    });
  return apiOk(previewCancellation(r, clock, settings), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
