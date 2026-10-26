import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

import { config } from '@/config';
import { hashToken } from '@/lib/auth/crypto';

const DEV_MFA_KEY = 'dev-admin-mfa-key-change-me';

function mfaKey(): Buffer {
  const value =
    config.ADMIN.MFA_ENCRYPTION_KEY ?? (config.isDev ? DEV_MFA_KEY : undefined);
  if (!value) throw new Error('ADMIN_MFA_ENCRYPTION_KEY must be set');
  return createHash('sha256').update(value).digest();
}

export interface MfaSetup {
  secret: string;
  uri: string;
  qrCodeDataUrl: string;
  manualKey: string;
}

export async function createMfaSetup(email: string): Promise<MfaSetup> {
  const secret = generateSecret();
  const uri = generateURI({
    issuer: config.SITE.NAME,
    label: email,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
  });
  return { secret, uri, qrCodeDataUrl, manualKey: secret };
}

export async function verifyTotp(
  secret: string,
  token: string,
): Promise<boolean> {
  if (!/^\d{6}$/.test(token.trim())) return false;
  try {
    const result = await verify({
      secret,
      token: token.trim(),
      epochTolerance: 30,
    });
    return result.valid;
  } catch {
    return false;
  }
}

export function encryptMfaSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', mfaKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted]
    .map((part) => part.toString('base64url'))
    .join('.');
}

export function decryptMfaSecret(value: string): string {
  const [ivPart, tagPart, dataPart] = value.split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Invalid MFA secret');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    mfaKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function recoveryCodeHash(code: string): string {
  return hashToken(normalizeRecoveryCode(code));
}
