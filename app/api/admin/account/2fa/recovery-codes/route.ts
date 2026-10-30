import { z } from 'zod';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAdminAudit } from '@/lib/auth/audit';
import { guardAdminApi } from '@/lib/auth/guards';
import { generateRecoveryCodes, recoveryCodeHash } from '@/lib/auth/mfa';
import { verifyPassword } from '@/lib/auth/password';
import { replaceRecoveryCodes } from '@/lib/db/repositories/staff.repo';
import { checkAdminCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { adminDisable2faSchema } from '@/schemas/admin-auth.schema';

export async function POST(request: Request) {
  const csrfError = checkAdminCsrf(request);
  if (csrfError) return csrfError;

  const guard = await guardAdminApi(request);
  if (!guard.ok) return guard.response;
  const { context } = guard;

  if (!context.user.mfaEnabled) {
    return apiFail(
      409,
      ERROR_MESSAGES.ADMIN_MFA_NOT_ENABLED,
      { code: ERROR_CODES.MFA_INVALID },
      { noCache: true },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = adminDisable2faSchema.safeParse(body);
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

  const codes = generateRecoveryCodes();
  await replaceRecoveryCodes(
    context.user.id,
    codes.map((code) => ({
      staffUserId: context.user.id,
      codeHash: recoveryCodeHash(code),
    })),
  );
  await writeAdminAudit({
    actorId: context.user.id,
    actorRole: context.role,
    action: 'mfa.recovery_rotated',
    entityId: context.user.id,
    changes: { recoveryCodeCount: codes.length },
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return apiOk({ recoveryCodes: codes }, { noCache: true });
}
