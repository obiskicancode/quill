import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { revokeAllSessionsForStaff } from '@/lib/db/repositories/staff.repo';
import { apiOk } from '@/lib/http/envelope';
import { clientIp } from '@/lib/http/request';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'staff.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;
  await revokeAllSessionsForStaff({
    id,
    actor: context.user,
    ipAddress: clientIp(request),
  });

  return apiOk(
    { success: true, message: SUCCESS_MESSAGES.SESSIONS_REVOKED },
    { noCache: true },
  );
}
