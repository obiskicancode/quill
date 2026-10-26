import { z } from 'zod';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAdminAudit } from '@/lib/auth/audit';
import {
  ADMIN_CHALLENGE_COOKIE,
  clearChallengeCookie,
} from '@/lib/auth/cookies';
import { safeEqual } from '@/lib/auth/crypto';
import { decryptMfaSecret, recoveryCodeHash, verifyTotp } from '@/lib/auth/mfa';
import { issueAdminSession } from '@/lib/auth/session';
import { readChallengeToken } from '@/lib/auth/tokens';
import {
  findStaffById,
  findUnusedRecoveryCodesForUser,
  markRecoveryCodeUsed,
} from '@/lib/db/repositories/staff.repo';
import { checkCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import {
  clientIp,
  cookieValue,
  tooManyRequests,
  userAgent,
} from '@/lib/http/request';
import { rateLimit } from '@/lib/rate-limit';
import { adminVerify2faSchema } from '@/schemas/admin-auth.schema';

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = adminVerify2faSchema.safeParse(body);
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

  const challenge = readChallengeToken(
    cookieValue(request, ADMIN_CHALLENGE_COOKIE),
  );
  if (!challenge) {
    return apiFail(
      401,
      ERROR_MESSAGES.ADMIN_MFA_EXPIRED,
      { code: ERROR_CODES.MFA_REQUIRED },
      { noCache: true },
    );
  }

  const ip = clientIp(request);
  if (
    !(await rateLimit(`admin-mfa:user:${challenge.sub}`, 8, 5 * 60_000)) ||
    !(await rateLimit(`admin-mfa:ip:${ip ?? 'local'}`, 20, 5 * 60_000))
  ) {
    return tooManyRequests(300);
  }

  const user = await findStaffById(challenge.sub);
  if (!user || !user.isActive || !user.mfaEnabled) {
    return apiFail(
      401,
      ERROR_MESSAGES.ADMIN_MFA_EXPIRED,
      { code: ERROR_CODES.MFA_REQUIRED },
      { noCache: true },
    );
  }

  const { code, mode } = parsed.data;
  let valid = false;

  if (mode === 'recovery') {
    const codes = await findUnusedRecoveryCodesForUser(user.id);
    const hash = recoveryCodeHash(code);
    const match = codes.find((entry) => safeEqual(entry.codeHash, hash));
    if (match) {
      const used = await markRecoveryCodeUsed(match.id);
      valid = Boolean(used);
    }
  } else if (user.mfaSecretEncrypted) {
    try {
      valid = await verifyTotp(decryptMfaSecret(user.mfaSecretEncrypted), code);
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    await writeAdminAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'login.mfa_failed',
      entityId: user.id,
      changes: { mode },
      ipAddress: ip,
      userAgent: userAgent(request),
    });
    return apiFail(
      401,
      ERROR_MESSAGES.ADMIN_MFA_INVALID,
      { code: ERROR_CODES.MFA_INVALID },
      { noCache: true },
    );
  }

  const response = apiOk({ redirectTo: '/admin' }, { noCache: true });
  clearChallengeCookie(response);
  await issueAdminSession(response, user, request, {
    stepUpVerifiedAt: new Date(),
  });
  await writeAdminAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'login.mfa_success',
    entityId: user.id,
    changes: { mode },
    ipAddress: ip,
    userAgent: userAgent(request),
  });
  return response;
}
