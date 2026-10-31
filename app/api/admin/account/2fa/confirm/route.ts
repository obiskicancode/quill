import { z } from 'zod';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAudit } from '@/lib/auth/audit';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  decryptMfaSecret,
  generateRecoveryCodes,
  recoveryCodeHash,
  verifyTotp,
} from '@/lib/auth/mfa';
import { markAdminSessionVerified } from '@/lib/auth/session';
import {
  replaceRecoveryCodes,
  setMfaEnabled,
} from '@/lib/db/repositories/staff.repo';
import { checkCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, tooManyRequests, userAgent } from '@/lib/http/request';
import { rateLimit } from '@/lib/rate-limit';
import { confirm2faSchema } from '@/schemas/auth.schema';

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await guardAdminApi(request, { allowPending: true });
  if (!guard.ok) return guard.response;
  const { context } = guard;

  const body = await request.json().catch(() => null);
  const parsed = confirm2faSchema.safeParse(body);
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
    !(await rateLimit(
      `admin-mfa-confirm:user:${context.user.id}`,
      8,
      10 * 60_000,
    ))
  ) {
    return tooManyRequests(600);
  }

  if (!context.user.mfaSecretEncrypted) {
    return apiFail(
      409,
      ERROR_MESSAGES.ADMIN_MFA_SETUP_REQUIRED,
      { code: ERROR_CODES.MFA_SETUP_REQUIRED, setupRequired: true },
      { noCache: true },
    );
  }

  let valid = false;
  try {
    valid = await verifyTotp(
      decryptMfaSecret(context.user.mfaSecretEncrypted),
      parsed.data.code,
    );
  } catch {
    valid = false;
  }

  if (!valid) {
    await writeAudit({
      actorId: context.user.id,
      actorRole: context.role,
      action: 'mfa.confirm_failed',
      entityId: context.user.id,
      ipAddress: clientIp(request),
      userAgent: userAgent(request),
    });
    return apiFail(
      422,
      ERROR_MESSAGES.ADMIN_MFA_INVALID,
      {
        code: ERROR_CODES.MFA_INVALID,
        fieldErrors: { code: ERROR_MESSAGES.ADMIN_MFA_INVALID },
      },
      { noCache: true },
    );
  }

  const codes = generateRecoveryCodes();
  await setMfaEnabled(context.user.id, true);
  await replaceRecoveryCodes(
    context.user.id,
    codes.map((code) => ({
      staffUserId: context.user.id,
      codeHash: recoveryCodeHash(code),
    })),
  );
  await markAdminSessionVerified(context.sessionId);

  await writeAudit({
    actorId: context.user.id,
    actorRole: context.role,
    action: 'mfa.enabled',
    entityId: context.user.id,
    changes: { recoveryCodeCount: codes.length },
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return apiOk({ recoveryCodes: codes }, { noCache: true });
}
