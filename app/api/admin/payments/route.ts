import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { listPayments } from '@/lib/db/repositories/payments.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { PaymentsQuerySchema } from '@/schemas/payments.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const parsed = PaymentsQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message ||
        ERROR_MESSAGES.INVALID_QUERY_PARAMETERS,
      undefined,
      { noCache: true },
    );
  }

  const result = await listPayments(parsed.data);
  return apiOk(result, { noCache: true });
}
