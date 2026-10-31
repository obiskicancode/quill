import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { requireStepUp } from '@/lib/auth/step-up';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { unreconcilePayment } from '@/lib/db/repositories/payments.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { UnreconcileInputSchema } from '@/schemas/payments.schema';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'payments.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const stepUp = requireStepUp(guard.context);
  if (!stepUp.ok) return stepUp.response;

  // Owner only
  if (context.role !== 'owner') {
    return apiFail(403, ERROR_MESSAGES.OWNERS_ONLY_UNRECONCILE, undefined, {
      noCache: true,
    });
  }

  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('id');
  if (!paymentId) {
    return apiFail(400, ERROR_MESSAGES.MISSING_PAYMENT_ID, undefined, {
      noCache: true,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFail(400, ERROR_MESSAGES.INVALID_JSON_BODY, undefined, {
      noCache: true,
    });
  }

  const parsed = UnreconcileInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message || ERROR_MESSAGES.REASON_REQUIRED,
      undefined,
      { noCache: true },
    );
  }

  const result = await unreconcilePayment({
    paymentId,
    actorId: context.user.id,
    actorRole: context.role,
    reason: parsed.data.reason,
  });

  if (!result.ok) {
    return apiFail(
      400,
      result.error || ERROR_MESSAGES.FAILED_TO_UNRECONCILE_PAYMENT,
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
    { success: true, message: SUCCESS_MESSAGES.PAYMENT_UNRECONCILED },
    { noCache: true },
  );
}
