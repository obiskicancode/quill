/**
 * CSRF protection for admin and guest manage sessions. Admin tokens are
 * HMAC-signed and double-submitted through a cookie plus header; manage tokens
 * are bound to the reservation reference and expiry.
 */
import { assertBookingSecret, assertCsrfSecret } from '@/config';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { hmacSign, randomToken, safeEqual } from '@/lib/auth/crypto';
import {
  ADMIN_CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_TTL_SECONDS,
} from '@/lib/cookies/constants';
import { getCookieValue } from '@/lib/cookies/server';

import { apiFail } from './envelope';

/**
 * Validates that the request origin matches the request host / x-forwarded-host.
 * Requests without an origin header (e.g., standard same-origin GET/fetch) are permitted.
 */
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

/**
 * Generates an HMAC-derived CSRF token containing: nonce.expiry.hmacSignature
 * Bound to the application secret and validated via verifyCsrfToken.
 */
export function createCsrfToken(ttl: number = CSRF_TTL_SECONDS): string {
  const nonce = randomToken(16);
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${nonce}.${exp}`;
  const sig = hmacSign(`admin.csrf.${payload}`, assertCsrfSecret()).slice(
    0,
    32,
  );
  return `${payload}.${sig}`;
}

/**
 * Validates the HMAC signature and expiration timestamp of an admin CSRF token.
 */
export function verifyCsrfToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length === 3) {
    const [nonce, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!nonce || !exp || Number.isNaN(exp) || exp < Date.now() / 1000) {
      return false;
    }
    const payload = `${nonce}.${exp}`;
    const expectedSig = hmacSign(
      `admin.csrf.${payload}`,
      assertCsrfSecret(),
    ).slice(0, 32);
    return safeEqual(sig, expectedSig);
  }
  return /^[a-zA-Z0-9_-]{32,}$/.test(token);
}

/**
 * Generates an HMAC-derived CSRF token for guest manage booking,
 * bound to the reservation reference and expiry timestamp.
 */
export function createManageCsrfToken(reference: string, exp: number): string {
  return hmacSign(`${reference}.csrf.${exp}`, assertBookingSecret()).slice(
    0,
    32,
  );
}

/**
 * Verifies an HMAC-derived guest manage booking CSRF token.
 */
export function verifyManageCsrfToken(
  reference: string,
  exp: number,
  token: string,
): boolean {
  if (!token || !reference || !exp) return false;
  const expected = createManageCsrfToken(reference, exp);
  return safeEqual(token, expected);
}

/**
 * Verifies a CSRF token from the `x-csrf-token` header against an expected token.
 * Validates request origin first to protect against cross-origin attacks.
 */
export function verifyCsrf(
  request: Request,
  expectedToken: string,
  errorMessage: string = ERROR_MESSAGES.CSRF_FAILED,
): Response | null {
  if (!sameOrigin(request)) {
    return apiFail(
      403,
      errorMessage,
      { code: ERROR_CODES.CSRF, message: errorMessage },
      { noCache: true },
    );
  }
  const header = request.headers.get(CSRF_HEADER_NAME);
  if (!header || !safeEqual(header, expectedToken)) {
    return apiFail(
      403,
      errorMessage,
      { code: ERROR_CODES.CSRF, message: errorMessage },
      { noCache: true },
    );
  }
  return null;
}

/**
 * Validates CSRF for guest manage booking requests against their active session CSRF token.
 */
export function checkManageCsrf(
  request: Request,
  sessionCsrf: string,
): Response | null {
  return verifyCsrf(request, sessionCsrf, ERROR_MESSAGES.CSRF_FAILED);
}

/**
 * Validates CSRF for admin requests against the ADMIN_CSRF cookie and x-csrf-token header.
 */
export function checkCsrf(request: Request): Response | null {
  if (!sameOrigin(request)) {
    return apiFail(
      403,
      ERROR_MESSAGES.ADMIN_CSRF_FAILED,
      { code: ERROR_CODES.CSRF },
      { noCache: true },
    );
  }
  const cookie = getCookieValue(request, ADMIN_CSRF_COOKIE_NAME);
  const header = request.headers.get(CSRF_HEADER_NAME);
  if (!cookie || !header || !safeEqual(cookie, header)) {
    return apiFail(
      403,
      ERROR_MESSAGES.ADMIN_CSRF_FAILED,
      { code: ERROR_CODES.CSRF },
      { noCache: true },
    );
  }
  if (!verifyCsrfToken(cookie)) {
    return apiFail(
      403,
      ERROR_MESSAGES.ADMIN_CSRF_FAILED,
      { code: ERROR_CODES.CSRF },
      { noCache: true },
    );
  }
  return null;
}
