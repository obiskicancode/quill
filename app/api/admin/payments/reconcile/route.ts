import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { requireStepUp } from '@/lib/auth/step-up';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { reconcilePaymentsBulkRepo } from '@/lib/db/repositories/payments-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { ReconcileBulkInputSchema } from '@/schemas/payments-admin.schema';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'payments.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const stepUp = requireStepUp(guard.context);
  if (!stepUp.ok) return stepUp.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFail(400, ERROR_MESSAGES.INVALID_JSON_BODY, undefined, {
      noCache: true,
    });
  }

  const parsed = ReconcileBulkInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message || ERROR_MESSAGES.INVALID_INPUT,
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
