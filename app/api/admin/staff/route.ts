import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { requireStepUp } from '@/lib/auth/step-up';
import {
  inviteStaffRepo,
  listStaffRepo,
} from '@/lib/db/repositories/staff-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp } from '@/lib/http/request';
import {
  StaffInviteInputSchema,
  StaffQuerySchema,
} from '@/schemas/staff-admin.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Staff accounts: owner only ('staff.manage')
  const guard = await guardAdminApi(request, { permission: 'staff.manage' });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const parsed = StaffQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiFail(400, ERROR_MESSAGES.INVALID_PARAMETERS, undefined, {
      noCache: true,
    });
  }

  const list = await listStaffRepo(parsed.data);
  return apiOk(list, { noCache: true });
}

export async function POST(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'staff.manage' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFail(400, ERROR_MESSAGES.INVALID_JSON_BODY, undefined, {
      noCache: true,
    });
  }

  const parsed = StaffInviteInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message ||
        ERROR_MESSAGES.INVALID_STAFF_INVITE_INPUT,
      undefined,
      { noCache: true },
    );
  }

  // Inviting an owner requires step-up authentication
  if (parsed.data.role === 'owner') {
    const stepUp = requireStepUp(context);
    if (!stepUp.ok) {
      return stepUp.response;
    }
  }

  const result = await inviteStaffRepo({
    input: parsed.data,
    actor: context.user,
    ipAddress: clientIp(request),
  });

  if (!result.ok) {
    return apiFail(
      400,
      result.error || ERROR_MESSAGES.FAILED_TO_INVITE_STAFF,
      undefined,
      { noCache: true },
    );
  }

  return apiOk(
    {
      success: true,
      message: SUCCESS_MESSAGES.INVITATION_SENT_TO(parsed.data.email),
      staffId: result.staffId,
    },
    { status: 201, noCache: true },
  );
}
