import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import { assertBookingSecret } from '@/config';
import { hmacSign, safeEqual } from '@/lib/auth/crypto';
import {
  buildCookieOptions,
  COOKIE_NAMES,
  COOKIE_TTLS,
} from '@/lib/cookies/constants';
import { createManageCsrfToken } from '@/lib/http/csrf';

/**
 * Short-lived, httpOnly, signed access cookie bound to one booking reference.
 * "checkout" is set right after the reservation is created (masked contact details).
 * "verified" is set after the guest proves their email (full details).
 */
export type AccessLevel = 'checkout' | 'verified';

const sign = (data: string) => hmacSign(data, assertBookingSecret());

export function createAccessValue(
  reference: string,
  level: AccessLevel,
  ttl = COOKIE_TTLS.BOOKING_ACCESS,
): string {
  const payload = `${Math.floor(Date.now() / 1000) + ttl}.${level === 'verified' ? 'v' : 'c'}`;
  return `${payload}.${sign(`${reference}.${payload}`)}`;
}

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

export async function getAccess(
  reference: string,
): Promise<AccessLevel | null> {
  const jar = await cookies();
  // A live manage session also proves the guest verified, so every booking endpoint accepts it.
  if (
    readManageValue(
      reference,
      jar.get(COOKIE_NAMES.BOOKING_MANAGE(reference))?.value,
    )
  )
    return 'verified';
  return readAccessValue(
    reference,
    jar.get(COOKIE_NAMES.BOOKING_ACCESS(reference))?.value,
  );
}

// Manage-booking session: 30 minutes, httpOnly, signed, bound to one reference. It also carries a CSRF token.

export function createManageValue(
  reference: string,
  ttl = COOKIE_TTLS.BOOKING_MANAGE,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  return `${exp}.${sign(`${reference}.mg.${exp}`)}`;
}

export interface ManageSession {
  expiresAt: number;
  /** Derived from the cookie and secret, so a cross-site page cannot forge a request. */
  csrf: string;
}

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

export async function getManageSession(
  reference: string,
): Promise<ManageSession | null> {
  const jar = await cookies();
  return readManageValue(
    reference,
    jar.get(COOKIE_NAMES.BOOKING_MANAGE(reference))?.value,
  );
}

export function setBookingAccessCookie(
  response: NextResponse,
  reference: string,
  valueOrLevel: AccessLevel | string,
  maxAge: number = COOKIE_TTLS.BOOKING_ACCESS,
): void {
  const value =
    valueOrLevel === 'checkout' || valueOrLevel === 'verified'
      ? createAccessValue(reference, valueOrLevel, maxAge)
      : valueOrLevel;
  response.cookies.set(
    COOKIE_NAMES.BOOKING_ACCESS(reference),
    value,
    buildCookieOptions({ maxAge }),
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

export function setBookingManageCookie(
  response: NextResponse,
  reference: string,
  value?: string,
  maxAge: number = COOKIE_TTLS.BOOKING_MANAGE,
): string {
  const actualValue = value ?? createManageValue(reference, maxAge);
  response.cookies.set(
    COOKIE_NAMES.BOOKING_MANAGE(reference),
    actualValue,
    buildCookieOptions({ maxAge }),
  );
  return actualValue;
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
