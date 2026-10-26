import type { NextResponse } from 'next/server';

import { config } from '@/config';

export const ADMIN_ACCESS_COOKIE = 'dea_admin_access';
export const ADMIN_REFRESH_COOKIE = 'dea_admin_refresh';
export const ADMIN_CHALLENGE_COOKIE = 'dea_admin_challenge';
export const ADMIN_CSRF_COOKIE = 'dea_admin_csrf';

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
export const CHALLENGE_TTL_SECONDS = 10 * 60;
export const CSRF_TTL_SECONDS = 2 * 60 * 60;

const secure = config.isProd;

export function setAccessCookie(
  response: NextResponse,
  token: string,
  maxAge = ACCESS_TTL_SECONDS,
): void {
  response.cookies.set(ADMIN_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export function setRefreshCookie(
  response: NextResponse,
  token: string,
  maxAge = REFRESH_TTL_SECONDS,
): void {
  response.cookies.set(ADMIN_REFRESH_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export function setChallengeCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(ADMIN_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export function clearChallengeCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_CHALLENGE_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  for (const name of [ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE]) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
  clearChallengeCookie(response);
}

export function createCsrfValue(): string {
  return `${crypto.randomUUID().replace(/-/g, '')}${crypto
    .randomUUID()
    .replace(/-/g, '')}`;
}
