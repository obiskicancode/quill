import { guardAdminApi } from '@/lib/auth/guards';
import { reprocessWebhookEvent } from '@/lib/db/repositories/payments.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'payments.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;
  const result = await reprocessWebhookEvent(id, context.user.id);

  if (!result.ok) {
    return apiFail(400, result.message, undefined, { noCache: true });
  }

  return apiOk({ success: true, message: result.message }, { noCache: true });
}
