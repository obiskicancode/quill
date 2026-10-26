import { guardAdminApi } from '@/lib/auth/guards';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { markManualRefundPaidOutRepo } from '@/lib/db/repositories/payments-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { ManualRefundPayoutInputSchema } from '@/types/payments-admin.types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'payments.refund' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFail(400, 'Invalid JSON body', undefined, { noCache: true });
  }

  const parsed = ManualRefundPayoutInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message || 'Invalid payout input',
      undefined,
      { noCache: true },
    );
  }

  const result = await markManualRefundPaidOutRepo({
    paymentId: id,
    input: parsed.data,
    staffUserId: context.user.id,
    actorRole: context.role,
  });

  if (!result.ok) {
    return apiFail(
      400,
      result.error || 'Failed to process refund payout',
      undefined,
      { noCache: true },
    );
  }

  await recordAuditLog({
    actorId: context.user.id,
    actorRole: context.role,
    entity: 'payment',
    entityId: id,
    action: 'manual_refund_paid_out',
    reason: `Manual refund paid out: ₦${(parsed.data.amountMinor / 100).toLocaleString()} via ${parsed.data.method}`,
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  }).catch(() => {});

  return apiOk(
    { success: true, message: 'Refund payout marked as paid' },
    { noCache: true },
  );
}
