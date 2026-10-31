import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { getPaymentDetail } from '@/lib/db/repositories/payments.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;
  const isOwner = context.role === 'owner';
  const detail = await getPaymentDetail(id, isOwner);

  if (!detail) {
    return apiFail(404, ERROR_MESSAGES.PAYMENT_NOT_FOUND, undefined, {
      noCache: true,
    });
  }

  return apiOk(detail, { noCache: true });
}
