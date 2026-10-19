import { apiOk } from '@/app/api/envelope';
import { clearManageCookie } from '@/lib/booking/session';
import { store } from '@/lib/checkout/mock-db';

/** Ends the manage session for this booking. Safe to repeat. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  store.audit.push({
    at: Date.now(),
    reference,
    action: 'sign_out',
    actor: 'guest',
  });
  const res = apiOk({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  clearManageCookie(res, reference);
  return res;
}
