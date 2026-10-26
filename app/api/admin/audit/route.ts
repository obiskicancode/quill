import { guardAdminApi } from '@/lib/auth/guards';
import { listAuditRepo } from '@/lib/db/repositories/audit-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AuditQuerySchema } from '@/types/audit-admin.types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'audit.view' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const parsed = AuditQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message || 'Invalid parameters',
      undefined,
      { noCache: true },
    );
  }

  // Server-side filtering by role: managers never receive security events
  const result = await listAuditRepo(parsed.data, context.role);
  return apiOk(result, { noCache: true });
}
