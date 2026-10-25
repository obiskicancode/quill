import { apiOk } from '@/app/api/envelope';
import { clearManageCookie } from '@/lib/booking/session';
import { createAuditLog } from '@/lib/db/repositories/audit.repo';

/** Ends the manage session for this booking. Safe to repeat. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  await createAuditLog({
    entity: 'reservation',
    entityId: reference,
    action: 'sign_out',
    changes: { actor: 'guest' },
  });
  const res = apiOk({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  clearManageCookie(res, reference);
  return res;
}
