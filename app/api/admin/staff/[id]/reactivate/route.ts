import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { reactivateStaff } from '@/lib/db/repositories/staff.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
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
  const result = await reactivateStaff({
    id,
    actor: context.user,
    ipAddress: clientIp(request),
  });

  if (!result.ok) {
    return apiFail(
      400,
      result.error || ERROR_MESSAGES.FAILED_TO_REACTIVATE_STAFF,
      undefined,
      { noCache: true },
    );
  }

  return apiOk(
    { success: true, message: SUCCESS_MESSAGES.STAFF_REACTIVATED },
    { noCache: true },
  );
}
