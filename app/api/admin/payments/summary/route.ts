import { guardAdminApi } from '@/lib/auth/guards';
import {
  getPaymentsBreakdown,
  getPaymentsSummary,
} from '@/lib/db/repositories/payments.repo';
import { apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const from = searchParams.get('from') || monthStart;
  const to = searchParams.get('to') || now.toISOString();

  const summary = await getPaymentsSummary(from, to);
  const breakdown = await getPaymentsBreakdown(from, to);

  return apiOk({ summary, breakdown }, { noCache: true });
}
