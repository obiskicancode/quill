import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { config } from '@/config';
import {
  ADMIN_CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '@/lib/cookies/constants';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipRefresh?: boolean;
  }
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

type CustomRequestConfig = InternalAxiosRequestConfig;

const isServer = typeof window === 'undefined';
const BASE_PATH = '/api';
const baseURL = isServer ? config.API.BASE_URL + BASE_PATH : BASE_PATH;

function readCsrfToken(cookieName: string = ADMIN_CSRF_COOKIE_NAME): string {
  if (typeof document === 'undefined') return '';
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === cookieName) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Dedicated Single Refresh Client (Prevents interceptor looping)
const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  for (const entry of failedQueue) {
    if (error) entry.reject(error);
    else entry.resolve();
  }
  failedQueue = [];
}

/**
 * Inject CSRF Token on state-changing methods
 */
apiClient.interceptors.request.use((request) => {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const existing =
      (typeof request.headers?.get === 'function'
        ? request.headers.get(CSRF_HEADER_NAME)
        : undefined) ?? request.headers?.[CSRF_HEADER_NAME];
    if (!existing) {
      const token = readCsrfToken(ADMIN_CSRF_COOKIE_NAME);
      if (token) {
        request.headers[CSRF_HEADER_NAME] = token;
      }
    }
  }
  return request;
});

/**
 * Handle 401 Expirations with Smart Path Routing
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!(error instanceof AxiosError)) throw error;

    const originalRequest = error.config as CustomRequestConfig | undefined;
    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.skipRefresh ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      throw error;
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => apiClient(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await refreshClient.post(
        '/admin/auth/refresh',
        {},
        {
          headers: {
            [CSRF_HEADER_NAME]: readCsrfToken(ADMIN_CSRF_COOKIE_NAME),
          },
        },
      );

      processQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);

      if (!isServer) {
        window.dispatchEvent(new Event('admin:session-expired'));
      }
      throw error;
    } finally {
      isRefreshing = false;
    }
  },
);
