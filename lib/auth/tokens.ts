import { assertAccessSecret, assertRefreshSecret } from '@/config';

import { hmacSign, safeEqual } from './crypto';

export interface SignedPayload {
  exp: number;
  [key: string]: unknown;
}

export interface AccessTokenPayload extends SignedPayload {
  sub: string;
  sid: string;
  role: string;
}

export interface ChallengePayload extends SignedPayload {
  sub: string;
  purpose: 'mfa';
}

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

export function createAccessToken(
  payload: { sub: string; sid: string; role: string },
  ttlSeconds: number,
): string {
  return createSignedToken(payload, assertAccessSecret(), ttlSeconds);
}

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
