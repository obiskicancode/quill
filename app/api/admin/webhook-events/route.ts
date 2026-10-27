import { guardAdminApi } from '@/lib/auth/guards';
import { listWebhookEventsRepo } from '@/lib/db/repositories/payments-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { WebhookEventsQuerySchema } from '@/schemas/payments-admin.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const parsed = WebhookEventsQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiFail(400, 'Invalid parameters', undefined, { noCache: true });
  }

  const result = await listWebhookEventsRepo(parsed.data);
  return apiOk(result, { noCache: true });
}
