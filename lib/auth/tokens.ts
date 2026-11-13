/**
 * Signed token helpers. Tokens are base64url JSON bodies with an HMAC signature
 * and a Unix expiry; they are used for admin access tokens and MFA challenge
 * tokens, not for long-lived credentials.
 */
import { assertAccessSecret, assertRefreshSecret } from '@/config';

import { hmacSign, safeEqual } from './crypto';

/** Common signed-token payload with a Unix expiry in seconds. */
export interface SignedPayload {
  exp: number;
  [key: string]: unknown;
}

/** Access-token claims: staff id, session id and role. */
export interface AccessTokenPayload extends SignedPayload {
  sub: string;
  sid: string;
  role: string;
}

/** Short-lived token proving the first factor before MFA verification. */
export interface ChallengePayload extends SignedPayload {
  sub: string;
  purpose: 'mfa';
}

/** Signs a payload with an expiry `ttlSeconds` from now. */
export function createSignedToken(
  payload: Record<string, unknown>,
  secret: string,
  ttlSeconds: number,
): string {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    }),
  ).toString('base64url');
  return `${body}.${hmacSign(body, secret)}`;
}

/**
 * Verifies the signature and expiry and returns the payload, or `null` for any
 * malformed, tampered or expired token.
 */
export function readSignedToken(
  token: string | null | undefined,
  secret: string,
): SignedPayload | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  if (!safeEqual(signature, hmacSign(body, secret))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as SignedPayload;
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Creates an admin access token using the configured access secret. */
export function createAccessToken(
  payload: { sub: string; sid: string; role: string },
  ttlSeconds: number,
): string {
  return createSignedToken(payload, assertAccessSecret(), ttlSeconds);
}

/** Reads an access token and validates its required claims. */
export function readAccessToken(
  value: string | null | undefined,
): AccessTokenPayload | null {
  const payload = readSignedToken(value, assertAccessSecret());
  if (
    !payload ||
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    return null;
  }
  return {
    ...payload,
    sub: payload.sub,
    sid: payload.sid,
    role: payload.role,
  };
}

/** Creates a short-lived MFA challenge token for a staff user. */
export function createChallengeToken(
  staffUserId: string,
  ttlSeconds: number,
): string {
  return createSignedToken(
    { sub: staffUserId, purpose: 'mfa' },
    assertRefreshSecret(),
    ttlSeconds,
  );
}

/** Reads an MFA challenge token and requires the `mfa` purpose claim. */
export function readChallengeToken(
  value: string | null | undefined,
): ChallengePayload | null {
  const payload = readSignedToken(value, assertRefreshSecret());
  if (
    !payload ||
    typeof payload.sub !== 'string' ||
    payload.purpose !== 'mfa'
  ) {
    return null;
  }
  return {
    ...payload,
    sub: payload.sub,
    purpose: payload.purpose,
  };
}
