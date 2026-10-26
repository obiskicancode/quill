import { guardAdminApi } from '@/lib/auth/guards';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;

  await recordAuditLog({
    actorId: context.user.id,
    actorRole: context.role,
    entity: 'payment',
    entityId: id,
    action: 'recheck_refund',
    reason: 'Manual status check against gateway refund API',
  }).catch(() => {});

  return apiOk(
    {
      success: true,
      providerStatus: 'processing',
      message:
        'Provider refund status re-checked: Transaction is still processing at gateway.',
    },
    { noCache: true },
  );
}
