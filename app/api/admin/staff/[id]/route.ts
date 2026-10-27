import { guardAdminApi } from '@/lib/auth/guards';
import { requireStepUp } from '@/lib/auth/step-up';
import {
  getStaffDetailRepo,
  updateStaffRepo,
} from '@/lib/db/repositories/staff-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp } from '@/lib/http/request';
import { StaffUpdateInputSchema } from '@/schemas/staff-admin.schema';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'staff.manage' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const detail = await getStaffDetailRepo(id);

  if (!detail) {
    return apiFail(404, 'Staff member not found', undefined, { noCache: true });
  }

  return apiOk(detail, { noCache: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'staff.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFail(400, 'Invalid JSON body', undefined, { noCache: true });
  }

  const parsed = StaffUpdateInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message || 'Invalid input',
      undefined,
      { noCache: true },
    );
  }

  // Role change requires step-up authentication
  const stepUp = requireStepUp(context);
  if (!stepUp.ok) {
    return stepUp.response;
  }

  const result = await updateStaffRepo({
    id,
    input: parsed.data,
    actor: context.user,
    ipAddress: clientIp(request),
  });

  if (!result.ok) {
    return apiFail(
      400,
      result.error || 'Failed to update staff member',
      undefined,
      { noCache: true },
    );
  }

  return apiOk(
    { success: true, message: 'Staff member updated successfully' },
    { noCache: true },
  );
}
