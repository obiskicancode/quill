import { z } from 'zod';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAudit } from '@/lib/auth/audit';
import { guardAdminApi } from '@/lib/auth/guards';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { toStaff } from '@/lib/db/mappers/staff.mapper';
import { update as updateStaff } from '@/lib/db/repositories/staff.repo';
import { checkCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { profileSchema } from '@/schemas/account.schema';

export async function GET(request: Request) {
  const guard = await guardAdminApi(request, { allowPending: true });
  if (!guard.ok) return guard.response;
  const { context } = guard;

  return apiOk(
    {
      staff: toStaff(context.user),
      role: context.role,
      permissions: ROLE_PERMISSIONS[context.role],
      mfaPending: context.user.role === 'owner' && !context.stepUpVerifiedAt,
      canSetupMfa: true,
    },
    { noCache: true },
  );
}

export async function PATCH(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await guardAdminApi(request);
  if (!guard.ok) return guard.response;
  const { context } = guard;

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.SOME_DETAILS_NEED_FIXING,
      {
        code: ERROR_CODES.VALIDATION,
        fieldErrors: z.treeifyError(parsed.error),
      },
      { noCache: true },
    );
  }

  const updated = await updateStaff(context.user.id, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone || null,
  });
  if (!updated) {
    return apiFail(
      404,
      ERROR_MESSAGES.ITEM_NOT_FOUND,
      { code: ERROR_CODES.NOT_FOUND },
      { noCache: true },
    );
  }

  await writeAudit({
    actorId: context.user.id,
    actorRole: context.role,
    action: 'profile.updated',
    entityId: context.user.id,
    changes: {
      firstName: { from: context.user.firstName, to: updated.firstName },
      lastName: { from: context.user.lastName, to: updated.lastName },
      phone: { from: context.user.phone, to: updated.phone },
    },
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return apiOk({ staff: toStaff(updated) }, { noCache: true });
}
