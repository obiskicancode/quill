import { guardAdminApi } from '@/lib/auth/guards';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { reconcilePaymentsBulkRepo } from '@/lib/db/repositories/payments-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { ReconcileBulkInputSchema } from '@/types/payments-admin.types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'payments.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFail(400, 'Invalid JSON body', undefined, { noCache: true });
  }

  const parsed = ReconcileBulkInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message || 'Invalid input',
      undefined,
      { noCache: true },
    );
  }

  const result = await reconcilePaymentsBulkRepo({
    paymentIds: parsed.data.paymentIds,
    staffUserId: context.user.id,
    note: parsed.data.note,
  });

  await recordAuditLog({
    actorId: context.user.id,
    actorRole: context.role,
    entity: 'payment',
    entityId: parsed.data.paymentIds.join(','),
    action: 'reconcile_bulk',
    reason:
      parsed.data.note || `Bulk reconciled ${result.reconciledCount} payments`,
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  }).catch(() => {});

  return apiOk(result, { noCache: true });
}
