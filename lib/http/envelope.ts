import { NextResponse } from 'next/server';

import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import type { ApiResponse } from '@/types/base.types';

export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

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
