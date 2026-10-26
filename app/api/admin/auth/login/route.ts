import { z } from 'zod';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAdminAudit } from '@/lib/auth/audit';
import { CHALLENGE_TTL_SECONDS, setChallengeCookie } from '@/lib/auth/cookies';
import { verifyDummyPassword, verifyPassword } from '@/lib/auth/password';
import { issueAdminSession } from '@/lib/auth/session';
import { createChallengeToken } from '@/lib/auth/tokens';
import {
  findStaffByEmail,
  recordSuccessfulLogin,
  registerFailedLogin,
} from '@/lib/db/repositories/staff.repo';
import { checkCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, tooManyRequests, userAgent } from '@/lib/http/request';
import { rateLimit } from '@/lib/rate-limit';
import { adminLoginSchema } from '@/schemas/admin-auth.schema';

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith('/admin') || value.startsWith('//')) {
    return '/admin';
  }
  return value;
}

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
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

  const { email, password, next } = parsed.data;
  const ip = clientIp(request);
  if (
    !(await rateLimit(`admin-login:ip:${ip ?? 'local'}`, 10, 60_000)) ||
    !(await rateLimit(`admin-login:email:${email}`, 5, 60_000))
  ) {
    return tooManyRequests();
  }

  const user = await findStaffByEmail(email);
  if (!user || !user.isActive) {
    await verifyDummyPassword(password);
    return apiFail(
      401,
      ERROR_MESSAGES.ADMIN_INVALID_CREDENTIALS,
      { code: ERROR_CODES.INVALID_CREDENTIALS },
      { noCache: true },
    );
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil(
      (user.lockedUntil.getTime() - now.getTime()) / 1000,
    );
    await writeAdminAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'login.locked',
      entityId: user.id,
      ipAddress: ip,
      userAgent: userAgent(request),
    });
    return apiFail(
      423,
      ERROR_MESSAGES.ADMIN_ACCOUNT_LOCKED,
      {
        code: ERROR_CODES.ACCOUNT_LOCKED,
        retryAfterSeconds,
        lockedUntil: user.lockedUntil.toISOString(),
      },
      { noCache: true, retryAfterSeconds },
    );
  }

  const passwordValid = user.passwordHash
    ? await verifyPassword(user.passwordHash, password)
    : false;
  if (!user.passwordHash) await verifyDummyPassword(password);
  if (!passwordValid) {
    const { staff, locked } = await registerFailedLogin(user.id);
    await writeAdminAudit({
      actorId: user.id,
      actorRole: user.role,
      action: locked ? 'login.locked' : 'login.failed',
      entityId: user.id,
      changes: { failedLoginCount: staff.failedLoginCount },
      ipAddress: ip,
      userAgent: userAgent(request),
    });
    if (locked && staff.lockedUntil) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((staff.lockedUntil.getTime() - Date.now()) / 1000),
      );
      return apiFail(
        423,
        ERROR_MESSAGES.ADMIN_ACCOUNT_LOCKED,
        {
          code: ERROR_CODES.ACCOUNT_LOCKED,
          retryAfterSeconds,
          lockedUntil: staff.lockedUntil.toISOString(),
        },
        { noCache: true, retryAfterSeconds },
      );
    }
    return apiFail(
      401,
      ERROR_MESSAGES.ADMIN_INVALID_CREDENTIALS,
      { code: ERROR_CODES.INVALID_CREDENTIALS },
      { noCache: true },
    );
  }

  await recordSuccessfulLogin(user.id, ip);

  if (user.mfaEnabled) {
    const response = apiOk({ mfaRequired: true }, { noCache: true });
    setChallengeCookie(
      response,
      createChallengeToken(user.id, CHALLENGE_TTL_SECONDS),
    );
    await writeAdminAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'login.mfa_challenge',
      entityId: user.id,
      ipAddress: ip,
      userAgent: userAgent(request),
    });
    return response;
  }

  const pending = user.role === 'owner';
  const response = apiOk(
    {
      redirectTo: pending ? '/admin/account?setup=required' : safeNext(next),
      setupRequired: pending,
    },
    { noCache: true },
  );
  await issueAdminSession(response, user, request, {
    stepUpVerifiedAt: pending ? null : undefined,
  });

  await writeAdminAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'login.success',
    entityId: user.id,
    changes: { mfaPending: pending },
    ipAddress: ip,
    userAgent: userAgent(request),
  });

  return response;
}
