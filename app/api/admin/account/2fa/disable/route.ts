import { z } from 'zod';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAudit } from '@/lib/auth/audit';
import { guardAdminApi } from '@/lib/auth/guards';
import { verifyPassword } from '@/lib/auth/password';
import {
  replaceRecoveryCodes,
  setMfaEnabled,
} from '@/lib/db/repositories/staff.repo';
import { checkCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { disable2faSchema } from '@/schemas/auth.schema';

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await guardAdminApi(request);
  if (!guard.ok) return guard.response;
  const { context } = guard;

  if (context.role === 'owner') {
    return apiFail(
      403,
      ERROR_MESSAGES.ADMIN_OWNER_MFA_CANNOT_DISABLE,
      { code: ERROR_CODES.NOT_ALLOWED },
      { noCache: true },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = disable2faSchema.safeParse(body);
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

  if (!context.user.mfaEnabled) {
    return apiFail(
      409,
      ERROR_MESSAGES.ADMIN_MFA_NOT_ENABLED,
      { code: ERROR_CODES.MFA_INVALID },
      { noCache: true },
    );
  }

  if (
    !context.user.passwordHash ||
    !(await verifyPassword(context.user.passwordHash, parsed.data.password))
  ) {
    return apiFail(
      422,
      ERROR_MESSAGES.ADMIN_CURRENT_PASSWORD_INVALID,
      {
        code: ERROR_CODES.CURRENT_PASSWORD_INVALID,
        fieldErrors: {
          password: ERROR_MESSAGES.ADMIN_CURRENT_PASSWORD_INVALID,
        },
      },
      { noCache: true },
    );
  }

  await setMfaEnabled(context.user.id, false);
  await replaceRecoveryCodes(context.user.id, []);
  await writeAudit({
    actorId: context.user.id,
    actorRole: context.role,
    action: 'mfa.disabled',
    entityId: context.user.id,
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return apiOk({ enabled: false }, { noCache: true });
}
