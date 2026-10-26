import { guardAdminApi } from '@/lib/auth/guards';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { unreconcilePaymentRepo } from '@/lib/db/repositories/payments-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { UnreconcileInputSchema } from '@/types/payments-admin.types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'payments.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  // Owner only
  if (context.role !== 'owner') {
    return apiFail(
      403,
      'Forbidden: Only owners are permitted to unreconcile payments',
      undefined,
      { noCache: true },
    );
  }

  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('id');
  if (!paymentId) {
    return apiFail(400, 'Missing payment ID parameter', undefined, {
      noCache: true,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFail(400, 'Invalid JSON body', undefined, { noCache: true });
  }

  const parsed = UnreconcileInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message || 'Reason is required',
      undefined,
      { noCache: true },
    );
  }

  const result = await unreconcilePaymentRepo({
    paymentId,
    actorId: context.user.id,
    actorRole: context.role,
    reason: parsed.data.reason,
  });

  if (!result.ok) {
    return apiFail(
      400,
      result.error || 'Failed to unreconcile payment',
      undefined,
      { noCache: true },
    );
  }

  await recordAuditLog({
    actorId: context.user.id,
    actorRole: context.role,
    entity: 'payment',
    entityId: paymentId,
    action: 'unreconcile',
    reason: parsed.data.reason,
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  }).catch(() => {});

  return apiOk(
    { success: true, message: 'Payment unreconciled successfully' },
    { noCache: true },
  );
}
