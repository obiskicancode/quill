import { z } from 'zod';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAdminAudit } from '@/lib/auth/audit';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from '@/lib/auth/password';
import {
  revokeOtherSessionsForUser,
  updateStaff,
} from '@/lib/db/repositories/staff.repo';
import { checkAdminCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { adminPasswordChangeSchema } from '@/schemas/admin-auth.schema';

export async function POST(request: Request) {
  const csrfError = checkAdminCsrf(request);
  if (csrfError) return csrfError;

  const guard = await guardAdminApi(request);
  if (!guard.ok) return guard.response;
  const { context } = guard;

  const body = await request.json().catch(() => null);
  const parsed = adminPasswordChangeSchema.safeParse(body);
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

  const { currentPassword, newPassword } = parsed.data;
  if (!context.user.passwordHash) {
    return apiFail(
      422,
      ERROR_MESSAGES.ADMIN_CURRENT_PASSWORD_INVALID,
      { code: ERROR_CODES.CURRENT_PASSWORD_INVALID },
      { noCache: true },
    );
  }

  if (!(await verifyPassword(context.user.passwordHash, currentPassword))) {
    return apiFail(
      422,
      ERROR_MESSAGES.ADMIN_CURRENT_PASSWORD_INVALID,
      {
        code: ERROR_CODES.CURRENT_PASSWORD_INVALID,
        fieldErrors: {
          currentPassword: ERROR_MESSAGES.ADMIN_CURRENT_PASSWORD_INVALID,
        },
      },
      { noCache: true },
    );
  }

  const policyError = validatePassword(newPassword);
  if (policyError) {
    return apiFail(
      422,
      policyError,
      {
        code: ERROR_CODES.VALIDATION,
        fieldErrors: { newPassword: policyError },
      },
      { noCache: true },
    );
  }

  if (await verifyPassword(context.user.passwordHash, newPassword)) {
    return apiFail(
      422,
      ERROR_MESSAGES.ADMIN_PASSWORD_UNCHANGED,
      {
        code: ERROR_CODES.VALIDATION,
        fieldErrors: { newPassword: ERROR_MESSAGES.ADMIN_PASSWORD_UNCHANGED },
      },
      { noCache: true },
    );
  }

  await updateStaff(context.user.id, {
    passwordHash: await hashPassword(newPassword),
  });
  const revoked = await revokeOtherSessionsForUser(
    context.user.id,
    context.sessionId,
  );

  await writeAdminAudit({
    actorId: context.user.id,
    actorRole: context.role,
    action: 'password.changed',
    entityId: context.user.id,
    changes: { otherSessionsRevoked: revoked },
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return apiOk({ revokedSessions: revoked }, { noCache: true });
}
