import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { recheckPayment } from '@/lib/db/repositories/payments.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;
  const result = await recheckPayment(id);

  await recordAuditLog({
    actorId: context.user.id,
    actorRole: context.role,
    entity: 'payment',
    entityId: id,
    action: 'recheck_refund',
    reason: `Manual status check: ${result.providerStatus}`,
  }).catch(() => {});

  if (!result.ok)
    return apiFail(
      502,
      result.error ?? ERROR_MESSAGES.PROVIDER_RECHECK_FAILED,
      {
        code: ERROR_CODES.SERVER,
        message: ERROR_MESSAGES.PROVIDER_RECHECK_FAILED,
      },
      { noCache: true },
    );

  return apiOk(
    {
      success: true,
      providerStatus: result.providerStatus,
      paymentStatus: result.paymentStatus,
      message: `Payment status: ${result.providerStatus}`,
    },
    { noCache: true },
  );
}
