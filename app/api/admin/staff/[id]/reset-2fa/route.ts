import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { requireStepUp } from '@/lib/auth/step-up';
import { resetStaffMfaRepo } from '@/lib/db/repositories/staff-admin.repo';
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

  // 2FA reset requires step-up authentication
  const stepUp = requireStepUp(context);
  if (!stepUp.ok) {
    return stepUp.response;
  }

  const { id } = await params;
  const result = await resetStaffMfaRepo({
    id,
    actor: context.user,
    ipAddress: clientIp(request),
  });

  if (!result.ok) {
    return apiFail(
      400,
      result.error || ERROR_MESSAGES.FAILED_TO_RESET_2FA,
      undefined,
      {
        noCache: true,
      },
    );
  }

  return apiOk(
    {
      success: true,
      message: SUCCESS_MESSAGES.STAFF_2FA_RESET,
    },
    { noCache: true },
  );
}
