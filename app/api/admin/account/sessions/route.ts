import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { writeAdminAudit } from '@/lib/auth/audit';
import { guardAdminApi } from '@/lib/auth/guards';
import { toAdminSession } from '@/lib/db/mappers/staff.mapper';
import {
  findSessionById,
  listActiveSessionsForUser,
  revokeOtherSessionsForUser,
  revokeSession,
} from '@/lib/db/repositories/staff.repo';
import { checkCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';

export async function GET(request: Request) {
  const guard = await guardAdminApi(request);
  if (!guard.ok) return guard.response;
  const { context } = guard;

  const sessions = await listActiveSessionsForUser(context.user.id);
  return apiOk(
    {
      sessions: sessions.map((session) =>
        toAdminSession(session, context.sessionId),
      ),
    },
    { noCache: true },
  );
}

export async function DELETE(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await guardAdminApi(request);
  if (!guard.ok) return guard.response;
  const { context } = guard;

  const body = await request.json().catch(() => null);
  const id =
    body && typeof body === 'object' && 'id' in body
      ? String((body as { id?: unknown }).id ?? '')
      : '';

  if (id) {
    if (id === context.sessionId) {
      return apiFail(
        400,
        ERROR_MESSAGES.SIGN_OUT_TO_END_SESSION,
        { code: ERROR_CODES.REJECTED },
        { noCache: true },
      );
    }
    const session = await findSessionById(id);
    if (!session || session.staffUserId !== context.user.id) {
      return apiFail(
        404,
        ERROR_MESSAGES.ITEM_NOT_FOUND,
        { code: ERROR_CODES.NOT_FOUND },
        { noCache: true },
      );
    }
    await revokeSession(session.id);
    await writeAdminAudit({
      actorId: context.user.id,
      actorRole: context.role,
      action: 'session.revoked',
      entityId: session.id,
      ipAddress: clientIp(request),
      userAgent: userAgent(request),
    });
    return apiOk({ revoked: 1 }, { noCache: true });
  }

  const revoked = await revokeOtherSessionsForUser(
    context.user.id,
    context.sessionId,
  );
  await writeAdminAudit({
    actorId: context.user.id,
    actorRole: context.role,
    action: 'session.revoked_others',
    entityId: context.user.id,
    changes: { revoked },
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });
  return apiOk({ revoked }, { noCache: true });
}
