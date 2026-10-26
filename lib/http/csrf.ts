import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { ADMIN_CSRF_COOKIE } from '@/lib/auth/cookies';
import { safeEqual } from '@/lib/auth/crypto';

import { apiFail } from './envelope';
import { cookieValue } from './request';

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const host =
      request.headers.get('host') || request.headers.get('x-forwarded-host');
    if (!host) return false;
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export function checkCsrf(request: Request): Response | null {
  if (!sameOrigin(request)) {
    return apiFail(
      403,
      ERROR_MESSAGES.ADMIN_CSRF_FAILED,
      { code: ERROR_CODES.CSRF },
      { noCache: true },
    );
  }
  const cookie = cookieValue(request, ADMIN_CSRF_COOKIE);
  const header = request.headers.get('x-csrf-token');
  if (!cookie || !header || !safeEqual(cookie, header)) {
    return apiFail(
      403,
      ERROR_MESSAGES.ADMIN_CSRF_FAILED,
      { code: ERROR_CODES.CSRF },
      { noCache: true },
    );
  }
  return null;
}
