import { guardAdminApi } from '@/lib/auth/guards';
import { sendPasswordResetRepo } from '@/lib/db/repositories/staff-admin.repo';
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
  await sendPasswordResetRepo({ id, actor: context.user });

  return apiOk(
    { success: true, message: 'Password reset link sent to staff email' },
    { noCache: true },
  );
}
