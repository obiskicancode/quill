import type { NextResponse } from 'next/server';

import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_ACCESS_TTL_SECONDS,
  ADMIN_CHALLENGE_COOKIE_NAME,
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_NAME,
  ADMIN_REFRESH_TTL_SECONDS,
  buildCookieOptions,
  CHALLENGE_TTL_SECONDS,
  CSRF_TTL_SECONDS,
} from './constants';

export function setAdminAccessCookie(
  response: NextResponse,
  token: string,
  maxAge: number = ADMIN_ACCESS_TTL_SECONDS,
): void {
  response.cookies.set(
    ADMIN_ACCESS_COOKIE_NAME,
    token,
    buildCookieOptions({ maxAge }),
  );
}

export function setRefreshCookie(
  response: NextResponse,
  token: string,
  maxAge: number = ADMIN_REFRESH_TTL_SECONDS,
): void {
  response.cookies.set(
    ADMIN_REFRESH_COOKIE_NAME,
    token,
    buildCookieOptions({ maxAge }),
  );
}

export function setChallengeCookie(
  response: NextResponse,
  token: string,
  maxAge: number = CHALLENGE_TTL_SECONDS,
): void {
  response.cookies.set(
    ADMIN_CHALLENGE_COOKIE_NAME,
    token,
    buildCookieOptions({ maxAge }),
  );
}

export function clearChallengeCookie(response: NextResponse): void {
  response.cookies.set(
    ADMIN_CHALLENGE_COOKIE_NAME,
    '',
    buildCookieOptions({ maxAge: 0 }),
  );
}

export function clearAuthCookies(response: NextResponse): void {
  for (const name of [ADMIN_ACCESS_COOKIE_NAME, ADMIN_REFRESH_COOKIE_NAME]) {
    response.cookies.set(name, '', buildCookieOptions({ maxAge: 0 }));
  }
  clearChallengeCookie(response);
}

export function setCsrfCookie(
  response: NextResponse,
  token: string,
  maxAge: number = CSRF_TTL_SECONDS,
): void {
  response.cookies.set(
    ADMIN_CSRF_COOKIE_NAME,
    token,
    buildCookieOptions({
      httpOnly: false, // Must be readable by client scripts for CSRF header injection
      maxAge,
    }),
  );
}

/** Parse a named cookie value from a Request or raw cookie string */
export function getCookieValue(
  request: Request | string,
  name: string,
): string | null {
  const header =
    typeof request === 'string' ? request : request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}
