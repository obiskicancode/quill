import { guardAdminApi } from '@/lib/auth/guards';
import { listPaymentsRepo } from '@/lib/db/repositories/payments-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { PaymentsQuerySchema } from '@/types/payments-admin.types';

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
      parsed.error.issues[0]?.message || 'Invalid query parameters',
      undefined,
      { noCache: true },
    );
  }

  const result = await listPaymentsRepo(parsed.data);
  return apiOk(result, { noCache: true });
}
