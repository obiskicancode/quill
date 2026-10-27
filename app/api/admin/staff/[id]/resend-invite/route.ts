import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { resendInviteRepo } from '@/lib/db/repositories/staff-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'staff.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;
  const result = await resendInviteRepo({ id, actor: context.user });

  if (!result.ok) {
    return apiFail(
      400,
      result.error || ERROR_MESSAGES.FAILED_TO_RESEND_INVITATION,
      undefined,
      { noCache: true },
    );
  }

  return apiOk(
    { success: true, message: SUCCESS_MESSAGES.INVITATION_RESENT },
    { noCache: true },
  );
}
