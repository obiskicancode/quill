import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { sendPasswordReset } from '@/lib/db/repositories/staff.repo';
import { apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'staff.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;
  await sendPasswordReset({ id, actor: context.user });

  return apiOk(
    { success: true, message: SUCCESS_MESSAGES.PASSWORD_RESET_LINK_SENT },
    { noCache: true },
  );
}
