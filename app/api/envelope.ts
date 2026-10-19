import { NextResponse } from 'next/server';

import type { ApiResponse } from '@/types/base.types';

/** Wraps a success payload in the standard API envelope. */
export function apiOk<T>(
  data: T,
  init?: ResponseInit,
): NextResponse<ApiResponse<T>> {
  const status = init?.status ?? 200;
  return NextResponse.json(
    { success: true, message: 'OK', status, data },
    init,
  );
}

/** Wraps an error in the standard API envelope. `data` keeps the original error body (code, fieldErrors, …). */
export function apiFail<T = unknown>(
  status: number,
  message: string,
  data?: T,
  init?: ResponseInit,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: false, message, status, data },
    { status, ...init },
  );
}
