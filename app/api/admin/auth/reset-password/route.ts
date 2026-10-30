import { z } from 'zod';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAdminAudit } from '@/lib/auth/audit';
import { hashToken } from '@/lib/auth/crypto';
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from '@/lib/auth/password';
import { clearAdminAuthCookies } from '@/lib/cookies';
import {
  findStaffById,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  revokeAllSessionsForUser,
  updateStaff,
} from '@/lib/db/repositories/staff.repo';
import { checkAdminCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, tooManyRequests, userAgent } from '@/lib/http/request';
import { rateLimit } from '@/lib/rate-limit';
import { adminResetPasswordSchema } from '@/schemas/admin-auth.schema';

export async function POST(request: Request) {
  const csrfError = checkAdminCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = adminResetPasswordSchema.safeParse(body);
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

  const ip = clientIp(request);
  if (
    !(await rateLimit(`admin-reset-submit:ip:${ip ?? 'local'}`, 10, 60_000))
  ) {
    return tooManyRequests();
  }

  const { token, password } = parsed.data;
  const passwordError = validatePassword(password);
  if (passwordError) {
    return apiFail(
      422,
      passwordError,
      {
        code: ERROR_CODES.VALIDATION,
        fieldErrors: { password: passwordError },
      },
      { noCache: true },
    );
  }

  const resetToken = await findValidPasswordResetToken(hashToken(token));
  if (!resetToken) {
    return apiFail(
      400,
      ERROR_MESSAGES.ADMIN_RESET_INVALID,
      { code: ERROR_CODES.TOKEN_INVALID },
      { noCache: true },
    );
  }

  const staff = await findStaffById(resetToken.staffUserId);
  if (!staff || !staff.isActive) {
    return apiFail(
      400,
      ERROR_MESSAGES.ADMIN_RESET_INVALID,
      { code: ERROR_CODES.TOKEN_INVALID },
      { noCache: true },
    );
  }

  if (
    staff.passwordHash &&
    (await verifyPassword(staff.passwordHash, password))
  ) {
    return apiFail(
      422,
      ERROR_MESSAGES.ADMIN_PASSWORD_UNCHANGED,
      {
        code: ERROR_CODES.VALIDATION,
        fieldErrors: { password: ERROR_MESSAGES.ADMIN_PASSWORD_UNCHANGED },
      },
      { noCache: true },
    );
  }

  const consumed = await markPasswordResetTokenUsed(resetToken.id);
  if (!consumed) {
    return apiFail(
      400,
      ERROR_MESSAGES.ADMIN_RESET_INVALID,
      { code: ERROR_CODES.TOKEN_INVALID },
      { noCache: true },
    );
  }

  await updateStaff(staff.id, {
    passwordHash: await hashPassword(password),
    failedLoginCount: 0,
    lockedUntil: null,
  });
  await revokeAllSessionsForUser(staff.id);

  await writeAdminAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'password_reset.completed',
    entityId: staff.id,
    ipAddress: ip,
    userAgent: userAgent(request),
  });

  const response = apiOk({ redirectTo: '/admin/login' }, { noCache: true });
  clearAdminAuthCookies(response);
  return response;
}
