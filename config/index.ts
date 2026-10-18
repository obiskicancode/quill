const isServer = typeof window === "undefined";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.AUTH_SECRET;
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.AUTH_SECRET;

if (isServer && (!ACCESS_SECRET || !REFRESH_SECRET)) {
  throw new Error("JWT secrets are not defined in the environment variables.");
}

export const config = {
  API: {
    BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
  },
  JWT: {
    ACCESS_SECRET: ACCESS_SECRET || "",
    REFRESH_SECRET: REFRESH_SECRET || "",
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
};
