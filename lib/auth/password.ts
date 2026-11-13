/**
 * Admin password policy and hashing. Passwords are hashed with argon2id; the
 * dummy verification path keeps login timing similar for unknown accounts.
 */
import argon2 from 'argon2';

import { ERROR_MESSAGES } from '@/constants/error-messages';

/** Minimum accepted admin password length. */
export const PASSWORD_MIN_LENGTH = 10;

const commonPasswords = new Set([
  '1234567890',
  '12345678910',
  'password',
  'password1',
  'password123',
  'password1234',
  'qwerty12345',
  'qwertyuiop',
  'letmein123',
  'welcome123',
  'admin12345',
  'administrator',
  'iloveyou123',
  'monkey12345',
  'dragon12345',
  'football123',
  'baseball123',
  'sunshine123',
  'princess123',
  'abcdefghij',
  'abcd123456',
  'hotel12345',
  'staff12345',
  'quill12345',
  'apartment1',
  'apartments',
  'booking123',
  'reception1',
  'manager123',
  'owner12345',
]);

/**
 * Returns a user-facing error when the password is too short, too long or in
 * the common-password blocklist, otherwise `null`.
 */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return ERROR_MESSAGES.ADMIN_PASSWORD_TOO_SHORT;
  }
  if (password.length > 200) return ERROR_MESSAGES.ADMIN_PASSWORD_TOO_LONG;
  if (
    commonPasswords.has(password.toLowerCase()) ||
    /^(.)\1{7,}$/.test(password) ||
    /^(0123456789|9876543210|abcdefghij)/i.test(password)
  ) {
    return ERROR_MESSAGES.ADMIN_PASSWORD_TOO_COMMON;
  }
  return null;
}

/** Hashes a password with argon2id using the project's cost settings. */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

/** Verifies a password against a stored hash, returning false on any error. */
export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/**
 * Performs a throwaway verification so a missing account takes a similar amount
 * of time as a wrong password.
 */
export async function verifyDummyPassword(password: string): Promise<void> {
  dummyHash ??= hashPassword('not-a-real-admin-password');
  await verifyPassword(await dummyHash, password);
}
