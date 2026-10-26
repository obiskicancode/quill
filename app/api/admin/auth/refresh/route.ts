import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { rotateAdminSession } from '@/lib/auth/session';
import { checkCsrf } from '@/lib/http/csrf';
import { apiFail, apiOk } from '@/lib/http/envelope';

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const response = apiOk({}, { noCache: true });
  const context = await rotateAdminSession(request, response);
  if (!context) {
    const failed = apiFail(
      401,
      ERROR_MESSAGES.ADMIN_SESSION_EXPIRED,
      { code: ERROR_CODES.SESSION_EXPIRED },
      { noCache: true },
    );
    clearAuthCookies(failed);
    return failed;
  }
  return response;
}
