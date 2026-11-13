/**
 * Request metadata helpers shared by API routes and services. Values are
 * defensive: untrusted proxy headers are validated, and user agents are
 * truncated before they reach audit or notification rows.
 */
import { isIP } from 'node:net';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';

import { apiFail } from './envelope';

/** Extract the client's IP from standard proxy headers. */
export function clientIp(request: Request): string | null {
  const value =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local';
  return value === 'local' || !isIP(value) ? null : value;
}

/** Extract and truncate the user-agent header. */
export function userAgent(request: Request): string | null {
  return request.headers.get('user-agent')?.slice(0, 1000) ?? null;
}

/** Parse a named cookie value from the raw Cookie header. */
export function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/** Standard 429 response with a `Retry-After` header and no-store caching. */
export function tooManyRequests(retryAfterSeconds = 60) {
  return apiFail(
    429,
    ERROR_MESSAGES.RATE_LIMITED,
    { code: ERROR_CODES.RATE_LIMITED, retryAfterSeconds },
    { noCache: true, retryAfterSeconds },
  );
}
