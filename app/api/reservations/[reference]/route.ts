import { apiFail, apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { getAccess } from '@/lib/booking/session';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { manageOpts } from '@/lib/manage/auth';
import type { BookingApiError } from '@/types/booking.types';

const deny = () => {
  const error: BookingApiError = {
    code: ERROR_CODES.UNAUTHORISED,
    message: ERROR_MESSAGES.VERIFY_BOOKING_TO_VIEW,
  };
  return apiFail(401, error.message, error, {
    headers: { 'Cache-Control': 'no-store' },
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
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    const error: BookingApiError = {
      code: ERROR_CODES.SERVER,
      message: ERROR_MESSAGES.BOOKING_LOAD_FAILED,
    };
    return apiFail(503, error.message, error);
  }
}
