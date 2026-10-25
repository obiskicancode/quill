import { apiFail, apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { getAccess } from '@/lib/booking/session';
import { loadReservation, statusOf } from '@/lib/booking/view';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * Polled by checkout and by the confirmation page. Needs the signed booking cookie,
 * so a bare reference cannot be probed. The answer is the same whether the reference is unknown or not yours.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const allowed = (await getAccess(reference)) !== null;
  const reservation = allowed ? await loadReservation(reference) : null;
  if (!reservation)
    return apiFail(
      404,
      ERROR_MESSAGES.RESERVATION_NOT_FOUND,
      { code: ERROR_CODES.NOT_FOUND },
      { headers: noStore },
    );
  return apiOk(statusOf(reservation), { headers: noStore });
}
