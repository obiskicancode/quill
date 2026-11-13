/**
 * Uniform JSON response envelopes for API routes. Every success and failure
 * carries the same shape so client services can branch on `success` and read a
 * stable message and status.
 */
import { NextResponse } from 'next/server';

import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import type { ApiResponse } from '@/types/base.types';

/** Headers that keep personalised API responses out of caches. */
export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

/**
 * Wraps a successful payload in the standard envelope. Pass `noCache` for
 * guest-specific or otherwise sensitive responses.
 */
export function apiOk<T>(
  data: T,
  init?: ResponseInit & { noCache?: boolean },
): NextResponse<ApiResponse<T>> {
  const { noCache, ...rest } = init ?? {};
  const headers = noCache
    ? { ...NO_STORE_HEADERS, ...(rest.headers ?? {}) }
    : rest.headers;
  return NextResponse.json(
    {
      success: true,
      message: SUCCESS_MESSAGES.OK,
      status: rest.status ?? 200,
      data,
    },
    { ...rest, headers },
  );
}

/**
 * Builds an error envelope. `retryAfterSeconds` adds a `Retry-After` header for
 * rate-limited responses, and `noCache` prevents intermediaries from storing
 * the failure.
 */
export function apiFail<T = unknown>(
  status: number,
  message: string,
  data?: T,
  init?: ResponseInit & { noCache?: boolean; retryAfterSeconds?: number },
): NextResponse<ApiResponse<T>> {
  const { noCache, retryAfterSeconds, ...rest } = init ?? {};
  const headers = {
    ...(noCache ? NO_STORE_HEADERS : {}),
    ...(retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : {}),
    ...(rest.headers ?? {}),
  };
  return NextResponse.json(
    { success: false, message, status, data },
    { status, ...rest, headers },
  );
}
