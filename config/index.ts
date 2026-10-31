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
    CSRF_SECRET: process.env.ADMIN_CSRF_SECRET,
  },
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
  JWT: {
    ACCESS_SECRET: ACCESS_SECRET || '',
    REFRESH_SECRET: REFRESH_SECRET || '',
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  STORAGE: {
    PROVIDER: process.env.STORAGE_PROVIDER ?? 'supabase',
    BUCKET: process.env.STORAGE_BUCKET ?? 'uploads',
    ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY,
    ENDPOINT: process.env.STORAGE_ENDPOINT,
    REGION: process.env.STORAGE_REGION ?? 'auto',
    FORCE_PATH_STYLE:
      (process.env.STORAGE_FORCE_PATH_STYLE ?? 'false') === 'true',
  },
  PAYMENT: {
    PROVIDER: process.env.PAYMENT_PROVIDER ?? 'paystack',
    BASE_URL:
      process.env.PAYMENT_PROVIDER_BASE_URL ?? 'https://api.paystack.co',
    PUBLIC_KEY: process.env.PAYMENT_PROVIDER_PUBLIC_KEY,
    SECRET_KEY: process.env.PAYMENT_PROVIDER_SECRET_KEY,
  },
  CRON: {
    SECRET: process.env.CRON_SECRET,
  },
  NOTIFICATIONS: {
    WEBHOOK_URL: process.env.NOTIFICATION_WEBHOOK_URL,
  },
  UPSTASH: {
    REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
};

export function assertBookingSecret() {
  if (!config.BOOKING.COOKIE_SECRET && config.isProd)
    throw new Error(ERROR_MESSAGES.BOOKING_COOKIE_SECRET_MISSING);

  return (
    config.BOOKING.COOKIE_SECRET || 'dev-only-booking-cookie-secret-change-me'
  );
}

export function assertCsrfSecret() {
  if (!config.ADMIN.CSRF_SECRET && config.isProd)
    throw new Error(ERROR_MESSAGES.ADMIN_CSRF_FAILED);

  return config.ADMIN.CSRF_SECRET || 'dev-only-admin-csrf-secret-change-me';
}

export function assertDbUrl() {
  if (!config.DB.URL) {
    throw new Error(ERROR_MESSAGES.DATABASE_URL_MISSING);
  }

  return config.DB.URL;
}

export function assertAccessSecret(): string {
  const secret = config.JWT.ACCESS_SECRET;
  if (secret) return secret;
  if (config.isDev) return 'dev-only-access-secret-change-me';
  throw new Error(ERROR_MESSAGES.JWT_SECRETS_MISSING);
}

export function assertRefreshSecret(): string {
  const secret = config.JWT.REFRESH_SECRET;
  if (secret) return secret;
  if (config.isDev) return 'dev-only-refresh-secret-change-me';
  throw new Error(ERROR_MESSAGES.JWT_SECRETS_MISSING);
}
