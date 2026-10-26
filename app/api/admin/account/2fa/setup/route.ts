import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAdminAudit } from '@/lib/auth/audit';
import { guardAdminApi } from '@/lib/auth/guards';
import { createMfaSetup, encryptMfaSecret } from '@/lib/auth/mfa';
import { setMfaSecret } from '@/lib/db/repositories/staff.repo';
import { checkCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, tooManyRequests, userAgent } from '@/lib/http/request';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await guardAdminApi(request, { allowPending: true });
  if (!guard.ok) return guard.response;
  const { context } = guard;

  if (
    !(await rateLimit(
      `admin-mfa-setup:user:${context.user.id}`,
      5,
      10 * 60_000,
    ))
  ) {
    return tooManyRequests(600);
  }

  if (context.user.mfaEnabled && context.user.mfaSecretEncrypted) {
    return apiFail(
      409,
      ERROR_MESSAGES.ADMIN_MFA_ALREADY_ENABLED,
      { code: ERROR_CODES.MFA_REQUIRED },
      { noCache: true },
    );
  }

  const setup = await createMfaSetup(context.user.email);
  await setMfaSecret(context.user.id, encryptMfaSecret(setup.secret));
  await writeAdminAudit({
    actorId: context.user.id,
    actorRole: context.role,
    action: 'mfa.setup_started',
    entityId: context.user.id,
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return apiOk(
    {
      qrCodeDataUrl: setup.qrCodeDataUrl,
      manualKey: setup.manualKey,
    },
    { noCache: true },
  );
}
