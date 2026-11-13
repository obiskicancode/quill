/**
 * Low-level cryptographic primitives for sessions, CSRF and MFA. These helpers
 * do not choose secrets or TTLs; callers pass the configured secret and keep
 * token lifetimes explicit.
 */
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/** Generates a URL-safe random token, 32 bytes by default. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Hashes a token for storage so the raw value never sits in the database. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time string comparison for signatures and tokens. */
export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signs a value with HMAC-SHA256 and returns a URL-safe signature. */
export function hmacSign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}
