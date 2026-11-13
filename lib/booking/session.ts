/**
 * Signed guest cookies for a single booking. Access cookies prove the guest has
 * reached a booking; manage cookies unlock short-lived changes and carry a CSRF
 * token bound to the reference.
 */
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import { assertBookingSecret } from '@/config';
import { hmacSign, safeEqual } from '@/lib/auth/crypto';
import {
  BOOKING_ACCESS_COOKIE_NAME,
  BOOKING_ACCESS_TTL_SECONDS,
  BOOKING_MANAGE_COOKIE_NAME,
  BOOKING_MANAGE_TTL_SECONDS,
  buildCookieOptions,
} from '@/lib/cookies/constants';
import { createManageCsrfToken } from '@/lib/http/csrf';

/**
 * Short-lived, httpOnly, signed access cookie bound to one booking reference.
 * "checkout" is set right after the reservation is created (masked contact details).
 * "verified" is set after the guest proves their email (full details).
 */
export type AccessLevel = 'checkout' | 'verified';

const sign = (data: string) => hmacSign(data, assertBookingSecret());

/** Creates a signed access-cookie value for one booking and access level. */
export function createAccessValue(
  reference: string,
  level: AccessLevel,
  ttl = BOOKING_ACCESS_TTL_SECONDS,
): string {
  const payload = `${Math.floor(Date.now() / 1000) + ttl}.${level === 'verified' ? 'v' : 'c'}`;
  return `${payload}.${sign(`${reference}.${payload}`)}`;
}

/** Verifies an access-cookie value and returns its level, or `null`. */
export function readAccessValue(
  reference: string,
  value: string | undefined,
): AccessLevel | null {
  if (!value) return null;
  const [exp, lvl, sig] = value.split('.');
  if (!exp || !lvl || !sig || Number(exp) < Date.now() / 1000) return null;
  if (!safeEqual(sign(`${reference}.${exp}.${lvl}`), sig)) return null;
  return lvl === 'v' ? 'verified' : 'checkout';
}

/**
 * Reads the best access level for a booking from the request cookies. A live
 * manage session counts as `verified`.
 */
export async function getAccess(
  reference: string,
): Promise<AccessLevel | null> {
  const jar = await cookies();
  // A live manage session also proves the guest verified, so every booking endpoint accepts it.
  if (
    readManageValue(
      reference,
      jar.get(BOOKING_MANAGE_COOKIE_NAME(reference))?.value,
    )
  )
    return 'verified';
  return readAccessValue(
    reference,
    jar.get(BOOKING_ACCESS_COOKIE_NAME(reference))?.value,
  );
}

/** Creates a signed manage-session value for one booking. */
export function createManageValue(
  reference: string,
  ttl = BOOKING_MANAGE_TTL_SECONDS,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  return `${exp}.${sign(`${reference}.mg.${exp}`)}`;
}

/** Verified manage-session data: its expiry and the CSRF token derived from it. */
export interface ManageSession {
  expiresAt: number;
  /** Derived from the cookie and secret, so a cross-site page cannot forge a request. */
  csrf: string;
}

/** Verifies a manage-session value and returns its expiry and CSRF token. */
export function readManageValue(
  reference: string,
  value: string | undefined,
): ManageSession | null {
  if (!value) return null;
  const [exp, sig] = value.split('.');
  const expNum = Number(exp);
  if (!exp || !sig || expNum < Date.now() / 1000) return null;
  if (!safeEqual(sign(`${reference}.mg.${exp}`), sig)) return null;
  return {
    expiresAt: expNum * 1000,
    csrf: createManageCsrfToken(reference, expNum),
  };
}

/** Reads the current manage session for a booking from the request cookies. */
export async function getManageSession(
  reference: string,
): Promise<ManageSession | null> {
  const jar = await cookies();
  return readManageValue(
    reference,
    jar.get(BOOKING_MANAGE_COOKIE_NAME(reference))?.value,
  );
}

/** Sets the booking access cookie, creating a signed value when given a level. */
export function setBookingAccessCookie(
  response: NextResponse,
  reference: string,
  valueOrLevel: AccessLevel | string,
  maxAge: number = BOOKING_ACCESS_TTL_SECONDS,
): void {
  const value =
    valueOrLevel === 'checkout' || valueOrLevel === 'verified'
      ? createAccessValue(reference, valueOrLevel, maxAge)
      : valueOrLevel;
  response.cookies.set(
    BOOKING_ACCESS_COOKIE_NAME(reference),
    value,
    buildCookieOptions({ maxAge }),
  );
}

/** Clears the booking access cookie. */
export function clearBookingAccessCookie(
  response: NextResponse,
  reference: string,
): void {
  response.cookies.set(
    BOOKING_ACCESS_COOKIE_NAME(reference),
    '',
    buildCookieOptions({ maxAge: 0 }),
  );
}

/** Sets the manage cookie and returns the value that was written. */
export function setBookingManageCookie(
  response: NextResponse,
  reference: string,
  value?: string,
  maxAge: number = BOOKING_MANAGE_TTL_SECONDS,
): string {
  const actualValue = value ?? createManageValue(reference, maxAge);
  response.cookies.set(
    BOOKING_MANAGE_COOKIE_NAME(reference),
    actualValue,
    buildCookieOptions({ maxAge }),
  );
  return actualValue;
}

/** Clears the booking manage cookie. */
export function clearBookingManageCookie(
  response: NextResponse,
  reference: string,
): void {
  response.cookies.set(
    BOOKING_MANAGE_COOKIE_NAME(reference),
    '',
    buildCookieOptions({ maxAge: 0 }),
  );
}
