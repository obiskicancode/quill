import { ERROR_MESSAGES } from '@/constants/error-messages';

const isProd = process.env.NODE_ENV === 'production';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.AUTH_SECRET;
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.AUTH_SECRET;

export const config = {
  isDev: !isProd,
  isProd,
  API: {
    BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000',
  },
  SITE: {
    NAME: process.env.NEXT_PUBLIC_SITE_NAME ?? 'Divine Excellent Apartments',
    URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  },
  DB: {
    URL: process.env.DATABASE_URL || '',
  },
  BOOKING: {
    COOKIE_SECRET: process.env.BOOKING_COOKIE_SECRET,
  },
  ADMIN: {
    MFA_ENCRYPTION_KEY: process.env.ADMIN_MFA_ENCRYPTION_KEY,
  },
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
  JWT: {
    ACCESS_SECRET: ACCESS_SECRET || '',
    REFRESH_SECRET: REFRESH_SECRET || '',
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  STORAGE: {
    PROVIDER: process.env.STORAGE_PROVIDER ?? 's3',
    BUCKET: process.env.STORAGE_BUCKET,
    ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY,
    ENDPOINT: process.env.STORAGE_ENDPOINT,
    REGION: process.env.STORAGE_REGION ?? 'auto',
    FORCE_PATH_STYLE:
      (process.env.STORAGE_FORCE_PATH_STYLE ?? 'false') === 'true',
  },
  PAYMENT: {
    POPUP: process.env.NEXT_PUBLIC_PAYMENT_POPUP === '1',
    PROVIDER: process.env.PAYMENT_PROVIDER ?? 'paystack',
    BASE_URL:
      process.env.PAYMENT_PROVIDER_BASE_URL ?? 'https://api.paystack.co',
    PUBLIC_KEY: process.env.PAYMENT_PROVIDER_PUBLIC_KEY,
    SECRET_KEY: process.env.PAYMENT_PROVIDER_SECRET_KEY,
  },
  UPSTASH: {
    REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
};

/** Call from auth code before signing tokens; throws when secrets are missing. */
export function assertJwtSecrets(): void {
  if (!config.JWT.ACCESS_SECRET || !config.JWT.REFRESH_SECRET) {
    throw new Error(ERROR_MESSAGES.JWT_SECRETS_MISSING);
  }
}

export function assertDbUrl(): void {
  if (!config.DB.URL) {
    throw new Error(ERROR_MESSAGES.DATABASE_URL_MISSING);
  }
}
