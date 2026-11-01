import { config } from '@/config';

/**
 * The booking access cookie carries the reference in its name, so a browser has one
 * cookie per booking it has started. `lib/booking/recovery.ts` enumerates this prefix
 * to find pending reservations to offer back — keep the two in sync.
 */
export const BOOKING_ACCESS_COOKIE_PREFIX = 'dea_bk_' as const;
export const BOOKING_MANAGE_COOKIE_PREFIX = 'dea_mg_' as const;

/**
 * Standard cookie names across Admin and Guest Booking flows.
 */
export const COOKIE_NAMES = {
  ADMIN_ACCESS: 'dea_admin_access',
  ADMIN_REFRESH: 'dea_admin_refresh',
  ADMIN_CHALLENGE: 'dea_admin_challenge',
  ADMIN_CSRF: 'dea_admin_csrf',
  BOOKING_ACCESS: (reference: string) =>
    `${BOOKING_ACCESS_COOKIE_PREFIX}${reference}`,
  BOOKING_MANAGE: (reference: string) =>
    `${BOOKING_MANAGE_COOKIE_PREFIX}${reference}`,
} as const;

/**
 * Standard cookie TTLs in seconds across Admin and Guest Booking flows.
 */
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

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
}

/**
 * Standard cookie configuration builder with safe production defaults.
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
 * Creates a cryptographically strong CSRF token using standard Web Crypto API.
 */
export function createCsrfToken(): string {
  return `${crypto.randomUUID().replace(/-/g, '')}${crypto
    .randomUUID()
    .replace(/-/g, '')}`;
}

export const CHALLENGE_TTL_SECONDS = COOKIE_TTLS.ADMIN_CHALLENGE;
export const CSRF_TTL_SECONDS = COOKIE_TTLS.ADMIN_CSRF;
export const BOOKING_ACCESS_TTL_SECONDS = COOKIE_TTLS.BOOKING_ACCESS;
export const BOOKING_MANAGE_TTL_SECONDS = COOKIE_TTLS.BOOKING_MANAGE;
export const ADMIN_ACCESS_TTL_SECONDS = COOKIE_TTLS.ADMIN_ACCESS;
export const ADMIN_REFRESH_TTL_SECONDS = COOKIE_TTLS.ADMIN_REFRESH;
export const BOOKING_ACCESS_COOKIE_NAME = COOKIE_NAMES.BOOKING_ACCESS;
export const BOOKING_MANAGE_COOKIE_NAME = COOKIE_NAMES.BOOKING_MANAGE;
export const ADMIN_ACCESS_COOKIE_NAME = COOKIE_NAMES.ADMIN_ACCESS;
export const ADMIN_REFRESH_COOKIE_NAME = COOKIE_NAMES.ADMIN_REFRESH;
export const ADMIN_CHALLENGE_COOKIE_NAME = COOKIE_NAMES.ADMIN_CHALLENGE;
export const ADMIN_CSRF_COOKIE_NAME = COOKIE_NAMES.ADMIN_CSRF;
