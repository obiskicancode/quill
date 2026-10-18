const isProd = process.env.NODE_ENV === "production";

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
      "http://localhost:3000",
  },
  SITE: {
    URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  },
  PAYMENT: {
    POPUP: process.env.NEXT_PUBLIC_PAYMENT_POPUP === "1",
  },
  BOOKING: {
    COOKIE_SECRET: process.env.BOOKING_COOKIE_SECRET,
  },
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === "true",
  JWT: {
    ACCESS_SECRET: ACCESS_SECRET || "",
    REFRESH_SECRET: REFRESH_SECRET || "",
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
};

/** Call from auth code before signing tokens; throws when secrets are missing. */
export function assertJwtSecrets(): void {
  if (!config.JWT.ACCESS_SECRET || !config.JWT.REFRESH_SECRET) {
    throw new Error("JWT secrets are not defined in the environment variables.");
  }
}
