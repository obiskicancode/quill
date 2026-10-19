import { apiFail, apiOk } from '@/app/api/envelope';
import { getAccess } from '@/lib/booking/session';
import { isDemoRef, loadReservation, statusOf } from '@/lib/booking/view';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * Polled by checkout and by the confirmation page. Needs the signed booking cookie (or the dev demo reference),
 * so a bare reference cannot be probed. The answer is the same whether the reference is unknown or not yours.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const demo = new URL(req.url).searchParams.get('demo');
  const allowed = isDemoRef(reference) || (await getAccess(reference)) !== null;
  const reservation = allowed ? await loadReservation(reference, demo) : null;
  if (!reservation)
    return apiFail(
      404,
      'Reservation not found.',
      { code: 'not_found' },
      { headers: noStore },
    );
  return apiOk(statusOf(reservation), { headers: noStore });
}
