import { clearManageCookie } from '@/lib/booking/session';
import { createAuditLog } from '@/lib/db/repositories/audit.repo';
import { apiOk } from '@/lib/http/envelope';

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
  const res = apiOk({ ok: true }, { noCache: true });
  clearManageCookie(res, reference);
  return res;
}
