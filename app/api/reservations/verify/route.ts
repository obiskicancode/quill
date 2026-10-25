import { apiFail, apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  createManageValue,
  readManageValue,
  setAccessCookie,
  setManageCookie,
} from '@/lib/booking/session';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { rateLimit } from '@/lib/rate-limit';
import { verifyRequestSchema } from '@/schemas/booking.schema';
import type { BookingApiError } from '@/types/booking.types';

const noStore = { 'Cache-Control': 'no-store' };
const GENERIC = ERROR_MESSAGES.VERIFY_NOT_FOUND;

/**
 * Proves the guest owns the booking with the reference plus the email used.
 * Rate-limited per client (5 tries per 10 minutes). Every failure returns the same message, so it cannot be used to guess bookings.
 */
export async function POST(req: Request) {
  const client =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!(await rateLimit(`verify:${client}`, 5, 10 * 60_000)).allowed) {
    const error: BookingApiError = {
      code: ERROR_CODES.RATE_LIMITED,
      message: ERROR_MESSAGES.VERIFY_TOO_MANY_ATTEMPTS,
      retryAfterSeconds: 600,
    };
    return apiFail(429, error.message, error, {
      headers: { ...noStore, 'Retry-After': '600' },
    });
  }
  const parsed = verifyRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    const error: BookingApiError = {
      code: ERROR_CODES.NOT_VERIFIED,
      message: GENERIC,
    };
    return apiFail(401, error.message, error, { headers: noStore });
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
    return apiFail(401, error.message, error, { headers: noStore });
  }
  if (scope === 'manage') {
    // A 30-minute management session. The body carries the CSRF token the browser must send with every change.
    const value = createManageValue(reference);
    const session = readManageValue(reference, value)!;
    const res = apiOk(
      await buildGuestReservation(reservation, 'verified', {
        manage: { csrf: session.csrf, expiresAt: session.expiresAt },
      }),
      { headers: noStore },
    );
    setManageCookie(res, reference, value);
    return res;
  }
  const res = apiOk(await buildGuestReservation(reservation, 'verified'), {
    headers: noStore,
  });
  setAccessCookie(res, reference, 'verified');
  return res;
}
