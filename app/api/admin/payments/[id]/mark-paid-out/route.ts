import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { requireStepUp } from '@/lib/auth/step-up';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { markManualRefundPaidOut } from '@/lib/db/repositories/payments.repo';
import { formatMinor } from '@/lib/format';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { ManualRefundPayoutInputSchema } from '@/schemas/payments.schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'payments.refund' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const stepUp = requireStepUp(guard.context);
  if (!stepUp.ok) return stepUp.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFail(400, ERROR_MESSAGES.INVALID_JSON_BODY, undefined, {
      noCache: true,
    });
  }

  const parsed = ManualRefundPayoutInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message || ERROR_MESSAGES.INVALID_PAYOUT_INPUT,
      undefined,
      { noCache: true },
    );
  }

  const result = await markManualRefundPaidOut({
    paymentId: id,
    input: parsed.data,
    staffUserId: context.user.id,
    actorRole: context.role,
  });

  if (!result.ok) {
    return apiFail(
      400,
      result.error || ERROR_MESSAGES.FAILED_TO_PROCESS_REFUND_PAYOUT,
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
    reason: `Manual refund paid out: ${formatMinor(parsed.data.amountMinor)} via ${parsed.data.method}`,
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  }).catch(() => {});

  return apiOk(
    { success: true, message: SUCCESS_MESSAGES.REFUND_PAYOUT_MARKED_PAID },
    { noCache: true },
  );
}
