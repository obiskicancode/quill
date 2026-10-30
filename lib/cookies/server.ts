import type { NextResponse } from 'next/server';

import { buildCookieOptions, COOKIE_NAMES, COOKIE_TTLS } from './constants';

export function setAdminAccessCookie(
  response: NextResponse,
  token: string,
  maxAge: number = COOKIE_TTLS.ADMIN_ACCESS,
): void {
  response.cookies.set(
    COOKIE_NAMES.ADMIN_ACCESS,
    token,
    buildCookieOptions({ maxAge }),
  );
}

export function setAdminRefreshCookie(
  response: NextResponse,
  token: string,
  maxAge: number = COOKIE_TTLS.ADMIN_REFRESH,
): void {
  response.cookies.set(
    COOKIE_NAMES.ADMIN_REFRESH,
    token,
    buildCookieOptions({ maxAge }),
  );
}

export function setAdminChallengeCookie(
  response: NextResponse,
  token: string,
  maxAge: number = COOKIE_TTLS.ADMIN_CHALLENGE,
): void {
  response.cookies.set(
    COOKIE_NAMES.ADMIN_CHALLENGE,
    token,
    buildCookieOptions({ maxAge }),
  );
}

export function clearAdminChallengeCookie(response: NextResponse): void {
  response.cookies.set(
    COOKIE_NAMES.ADMIN_CHALLENGE,
    '',
    buildCookieOptions({ maxAge: 0 }),
  );
}

export function clearAdminAuthCookies(response: NextResponse): void {
  for (const name of [COOKIE_NAMES.ADMIN_ACCESS, COOKIE_NAMES.ADMIN_REFRESH]) {
    response.cookies.set(name, '', buildCookieOptions({ maxAge: 0 }));
  }
  clearAdminChallengeCookie(response);
}

export function setAdminCsrfCookie(
  response: NextResponse,
  token: string,
  maxAge: number = COOKIE_TTLS.ADMIN_CSRF,
): void {
  response.cookies.set(
    COOKIE_NAMES.ADMIN_CSRF,
    token,
    buildCookieOptions({
      httpOnly: false, // Must be readable by client scripts for CSRF header injection
      maxAge,
    }),
  );
}

export function setBookingAccessCookie(
  response: NextResponse,
  reference: string,
  value: string,
  maxAge: number = COOKIE_TTLS.BOOKING_ACCESS,
): void {
  response.cookies.set(
    COOKIE_NAMES.BOOKING_ACCESS(reference),
    value,
    buildCookieOptions({ maxAge }),
  );
}

export function setBookingManageCookie(
  response: NextResponse,
  reference: string,
  value: string,
  maxAge: number = COOKIE_TTLS.BOOKING_MANAGE,
): void {
  response.cookies.set(
    COOKIE_NAMES.BOOKING_MANAGE(reference),
    value,
    buildCookieOptions({ maxAge }),
  );
}

export function clearBookingManageCookie(
  response: NextResponse,
  reference: string,
): void {
  response.cookies.set(
    COOKIE_NAMES.BOOKING_MANAGE(reference),
    '',
    buildCookieOptions({ maxAge: 0 }),
  );
}

export function clearBookingAccessCookie(
  response: NextResponse,
  reference: string,
): void {
  response.cookies.set(
    COOKIE_NAMES.BOOKING_ACCESS(reference),
    '',
    buildCookieOptions({ maxAge: 0 }),
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
