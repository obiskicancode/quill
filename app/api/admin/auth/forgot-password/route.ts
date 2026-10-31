import { z } from 'zod';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAudit } from '@/lib/auth/audit';
import { hashToken, randomToken } from '@/lib/auth/crypto';
import {
  createPasswordResetToken,
  findStaffByEmail,
  invalidatePasswordResetTokensForUser,
} from '@/lib/db/repositories/staff.repo';
import { checkCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, tooManyRequests, userAgent } from '@/lib/http/request';
import { sendAdminPasswordResetEmail } from '@/lib/mail';
import { rateLimit } from '@/lib/rate-limit';
import { forgotPasswordSchema } from '@/schemas/auth.schema';

const RESET_TOKEN_TTL_MS = 60 * 60_000;

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
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

  const { email } = parsed.data;
  const ip = clientIp(request);
  if (
    !(await rateLimit(`admin-reset:ip:${ip ?? 'local'}`, 10, 60_000)) ||
    !(await rateLimit(`admin-reset:email:${email}`, 5, 15 * 60_000))
  ) {
    return tooManyRequests();
  }

  const staff = await findStaffByEmail(email);
  if (staff && staff.isActive) {
    await invalidatePasswordResetTokensForUser(staff.id);
    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await createPasswordResetToken({
      staffUserId: staff.id,
      tokenHash: hashToken(token),
      purpose: 'reset',
      expiresAt,
      requestedIp: ip,
    });
    await sendAdminPasswordResetEmail({ staff, token, expiresAt });
    await writeAudit({
      actorId: staff.id,
      actorRole: staff.role,
      action: 'password_reset.requested',
      entityId: staff.id,
      ipAddress: ip,
      userAgent: userAgent(request),
    });
  }

  return apiOk({ sent: true }, { noCache: true });
}
