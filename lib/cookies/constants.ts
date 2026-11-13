/**
 * Cookie names, lifetimes and safe defaults shared by admin and guest flows.
 * Booking cookies are prefixed by reference so one browser can hold several
 * pending stays without collisions.
 */
import { config } from '@/config';

/**
 * The booking access cookie carries the reference in its name, so a browser has one
 * cookie per booking it has started. `lib/booking/recovery.ts` enumerates this prefix
 * to find pending reservations to offer back — keep the two in sync.
 */
export const BOOKING_ACCESS_COOKIE_PREFIX = 'quill_bk_' as const;
/** Per-booking manage-session cookie prefix; mirrors the access prefix scheme. */
export const BOOKING_MANAGE_COOKIE_PREFIX = 'quill_mg_' as const;

/**
 * Standard cookie names across admin and guest booking flows. Functions build
 * per-booking names from the reference.
 */
export const COOKIE_NAMES = {
  ADMIN_ACCESS: 'quill_admin_access',
  ADMIN_REFRESH: 'quill_admin_refresh',
  ADMIN_CHALLENGE: 'quill_admin_challenge',
  ADMIN_CSRF: 'quill_admin_csrf',
  BOOKING_ACCESS: (reference: string) =>
    `${BOOKING_ACCESS_COOKIE_PREFIX}${reference}`,
  BOOKING_MANAGE: (reference: string) =>
    `${BOOKING_MANAGE_COOKIE_PREFIX}${reference}`,
} as const;

/** Standard cookie lifetimes in seconds for admin and guest flows. */
export const COOKIE_TTLS = {
  ADMIN_ACCESS: 15 * 60, // 15 minutes
  ADMIN_REFRESH: 7 * 24 * 60 * 60, // 7 days
  ADMIN_CHALLENGE: 10 * 60, // 10 minutes
  ADMIN_CSRF: 2 * 60 * 60, // 2 hours
  BOOKING_ACCESS: 2 * 60 * 60, // 2 hours
  BOOKING_MANAGE: 30 * 60, // 30 minutes
} as const;

/** Standard header name for sending CSRF tokens */
export const CSRF_HEADER_NAME = 'x-csrf-token';

/** Cookie attributes accepted by the response helpers. */
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
}

/**
 * Builds cookie attributes with httpOnly, secure-in-production and lax
 * same-site defaults, allowing callers to override individual values.
 */
export function buildCookieOptions(
  overrides: CookieOptions = {},
): CookieOptions {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    ...overrides,
  };
}

/**
 * Creates a cryptographically strong random CSRF value using the Web Crypto
 * API. This is the unsigned client cookie value; the admin route helpers also
 * validate the HMAC token in `lib/http/csrf`.
 */
export function createCsrfToken(): string {
  return `${crypto.randomUUID().replace(/-/g, '')}${crypto
    .randomUUID()
    .replace(/-/g, '')}`;
}

/** MFA challenge cookie lifetime. */
export const CHALLENGE_TTL_SECONDS = COOKIE_TTLS.ADMIN_CHALLENGE;
/** Admin CSRF cookie lifetime. */
export const CSRF_TTL_SECONDS = COOKIE_TTLS.ADMIN_CSRF;
/** Guest booking access cookie lifetime. */
export const BOOKING_ACCESS_TTL_SECONDS = COOKIE_TTLS.BOOKING_ACCESS;
/** Guest manage-session cookie lifetime. */
export const BOOKING_MANAGE_TTL_SECONDS = COOKIE_TTLS.BOOKING_MANAGE;
/** Admin access-token cookie lifetime. */
export const ADMIN_ACCESS_TTL_SECONDS = COOKIE_TTLS.ADMIN_ACCESS;
/** Admin refresh-token cookie lifetime. */
export const ADMIN_REFRESH_TTL_SECONDS = COOKIE_TTLS.ADMIN_REFRESH;
/** Cookie name builder for a booking's access token. */
export const BOOKING_ACCESS_COOKIE_NAME = COOKIE_NAMES.BOOKING_ACCESS;
/** Cookie name builder for a booking's manage session. */
export const BOOKING_MANAGE_COOKIE_NAME = COOKIE_NAMES.BOOKING_MANAGE;
/** Admin access-token cookie name. */
export const ADMIN_ACCESS_COOKIE_NAME = COOKIE_NAMES.ADMIN_ACCESS;
/** Admin refresh-token cookie name. */
export const ADMIN_REFRESH_COOKIE_NAME = COOKIE_NAMES.ADMIN_REFRESH;
/** Admin MFA challenge cookie name. */
export const ADMIN_CHALLENGE_COOKIE_NAME = COOKIE_NAMES.ADMIN_CHALLENGE;
/** Admin CSRF cookie name. */
export const ADMIN_CSRF_COOKIE_NAME = COOKIE_NAMES.ADMIN_CSRF;
