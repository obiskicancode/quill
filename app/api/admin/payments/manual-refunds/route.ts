import { guardAdminApi } from '@/lib/auth/guards';
import { listManualRefundsRepo } from '@/lib/db/repositories/payments-admin.repo';
import { apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;

  const items = await listManualRefundsRepo();
  return apiOk(items, { noCache: true });
}
