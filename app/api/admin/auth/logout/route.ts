import { writeAudit } from '@/lib/auth/audit';
import { resolveAdminSession, revokeAdminSession } from '@/lib/auth/session';
import { checkCsrf } from '@/lib/http/csrf';
import { apiOk } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const context = await resolveAdminSession(request);
  const response = apiOk({}, { noCache: true });
  if (context) {
    await revokeAdminSession(context, response);
    await writeAudit({
      actorId: context.user.id,
      actorRole: context.role,
      action: 'logout',
      entityId: context.user.id,
      ipAddress: clientIp(request),
      userAgent: userAgent(request),
    });
  }
  return response;
}
