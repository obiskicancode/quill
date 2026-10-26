import { guardAdminApi } from '@/lib/auth/guards';
import { decryptMfaSecret, verifyTotp } from '@/lib/auth/mfa';
import { verifyPassword } from '@/lib/auth/password';
import { markAdminSessionVerified } from '@/lib/auth/session';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { StepUpAuthInputSchema } from '@/types/staff-admin.types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const guard = await guardAdminApi(request);
  if (!guard.ok) return guard.response;
  const context = guard.context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFail(400, 'Invalid JSON request', undefined, { noCache: true });
  }

  const parsed = StepUpAuthInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      400,
      parsed.error.issues[0]?.message || 'Invalid step-up input',
      undefined,
      { noCache: true },
    );
  }

  const { password, totpCode } = parsed.data;
  let isVerified = false;

  if (totpCode && context.user.mfaSecretEncrypted) {
    try {
      const secret = decryptMfaSecret(context.user.mfaSecretEncrypted);
      isVerified = await verifyTotp(secret, totpCode);
    } catch {
      isVerified = false;
    }
  }

  if (!isVerified && password && context.user.passwordHash) {
    isVerified = await verifyPassword(context.user.passwordHash, password);
  }

  if (!isVerified) {
    await recordAuditLog({
      actorId: context.user.id,
      actorRole: context.role,
      entity: 'staff_session',
      entityId: context.sessionId,
      action: 'step_up_failed',
      reason: 'Failed step-up verification credentials',
      ipAddress: clientIp(request),
      userAgent: userAgent(request),
    }).catch(() => {});

    return apiFail(
      400,
      'Invalid password or 2FA verification code',
      undefined,
      { noCache: true },
    );
  }

  await markAdminSessionVerified(context.sessionId);

  await recordAuditLog({
    actorId: context.user.id,
    actorRole: context.role,
    entity: 'staff_session',
    entityId: context.sessionId,
    action: 'step_up',
    reason: 'Step-up authentication verified',
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  }).catch(() => {});

  const now = new Date();
  return apiOk(
    { success: true, verifiedAt: now.toISOString() },
    { noCache: true },
  );
}
