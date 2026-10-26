import { guardAdminApi } from '@/lib/auth/guards';
import { getAuditDetailRepo } from '@/lib/db/repositories/audit-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'audit.view' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;
  const detail = await getAuditDetailRepo(id, context.role);

  if (!detail) {
    return apiFail(404, 'Audit entry not found or restricted', undefined, {
      noCache: true,
    });
  }

  return apiOk(detail, { noCache: true });
}
