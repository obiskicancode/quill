import { apiFail, apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { getAccess } from '@/lib/booking/session';
import { logEvent, saveStoredReservation } from '@/lib/booking/store';
import { loadReservation } from '@/lib/booking/view';
import { rateLimit } from '@/lib/rate-limit';
import type { BookingApiError, ResendResponse } from '@/types/booking.types';

const COOLDOWN_SECONDS = 60;
const g = globalThis as unknown as { __deaResend?: Map<string, number> };
const lastSent = (g.__deaResend ??= new Map<string, number>());
const noStore = { 'Cache-Control': 'no-store' };

const unauthorised = () => {
  const error: BookingApiError = {
    code: ERROR_CODES.UNAUTHORISED,
    message: ERROR_MESSAGES.VERIFY_BOOKING_FIRST,
  };
  return apiFail(401, error.message, error, { headers: noStore });
};

/** Re-sends the confirmation email. One per minute and three per hour per booking. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  if (!(await getAccess(reference))) return unauthorised();
  const found = await loadReservation(reference);
  if (!found) return unauthorised();

  const wait = Math.ceil(
    (COOLDOWN_SECONDS * 1000 - (Date.now() - (lastSent.get(reference) ?? 0))) /
      1000,
  );
  if (
    wait > 0 ||
    !(await rateLimit(`resend:${reference}`, 3, 60 * 60_000)).allowed
  ) {
    const retryAfterSeconds = wait > 0 ? wait : 3600;
    const error: BookingApiError = {
      code: ERROR_CODES.RATE_LIMITED,
      message: ERROR_MESSAGES.WAIT_FOR_EMAIL,
      retryAfterSeconds,
    };
    return apiFail(429, error.message, error, {
      headers: { ...noStore, 'Retry-After': String(retryAfterSeconds) },
    });
  }
  lastSent.set(reference, Date.now());
  logEvent(
    found,
    'email_sent',
    'Confirmation email sent again at your request.',
    'guest',
  );
  found.notifications ??= [];
  found.notifications.push({
    kind: 'confirmation',
    detail: 'Confirmation email sent again at your request.',
  });
  await saveStoredReservation(found);
  return apiOk<ResendResponse>(
    { sent: true, cooldownSeconds: COOLDOWN_SECONDS },
    { headers: noStore },
  );
}
