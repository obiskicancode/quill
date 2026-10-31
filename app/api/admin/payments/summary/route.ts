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
  const from = searchParams.get('from') || '2026-10-01';
  const to = searchParams.get('to') || '2026-10-26';

  const summary = await getPaymentsSummary(from, to);
  const breakdown = await getPaymentsBreakdown();

  return apiOk({ summary, breakdown }, { noCache: true });
}
