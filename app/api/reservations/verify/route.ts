import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  createManageValue,
  readManageValue,
  setBookingAccessCookie,
  setBookingManageCookie,
} from '@/lib/booking/session';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, tooManyRequests } from '@/lib/http/request';
import { rateLimit } from '@/lib/rate-limit';
import { verifyRequestSchema } from '@/schemas/booking.schema';
import type { BookingApiError } from '@/types/booking.types';

const GENERIC = ERROR_MESSAGES.VERIFY_NOT_FOUND;

/**
 * Proves the guest owns the booking with the reference plus the email used.
 * Rate-limited per client (5 tries per 10 minutes). Every failure returns the same message, so it cannot be used to guess bookings.
 */
export async function POST(req: Request) {
  const client = clientIp(req) ?? 'local';
  if (!(await rateLimit(`verify:${client}`, 5, 10 * 60_000)).allowed) {
    return tooManyRequests(600);
  }
  const parsed = verifyRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    const error: BookingApiError = {
      code: ERROR_CODES.NOT_VERIFIED,
      message: GENERIC,
    };
    return apiFail(401, error.message, error, { noCache: true });
  }

  const { reference, email, scope } = parsed.data;

  const reservation = await loadReservation(reference);
  if (
    !reservation ||
    !reservation.guest.email ||
    reservation.guest.email.toLowerCase() !== email.toLowerCase()
  ) {
    const error: BookingApiError = {
      code: ERROR_CODES.NOT_VERIFIED,
      message: GENERIC,
    };
    return apiFail(401, error.message, error, { noCache: true });
  }
  if (scope === 'manage') {
    // A 30-minute management session. The body carries the CSRF token the browser must send with every change.
    const value = createManageValue(reference);
    const session = readManageValue(reference, value)!;
    const res = apiOk(
      await buildGuestReservation(reservation, 'verified', {
        manage: { csrf: session.csrf, expiresAt: session.expiresAt },
      }),
      { noCache: true },
    );
    setBookingManageCookie(res, reference, value);
    return res;
  }
  const res = apiOk(await buildGuestReservation(reservation, 'verified'), {
    noCache: true,
  });
  setBookingAccessCookie(res, reference, 'verified');
  return res;
}
