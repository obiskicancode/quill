export interface IRetryOptions {
  /** Total attempts, including the first call. */
  retries?: number;
  delay?: number;
  operation?: string;
  shouldRetry?: (error: unknown) => boolean;
  minimumDelayForError?: (error: unknown, attempt: number) => number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  status: number;
  meta?: Record<string, unknown>;
  data?: T;
}

/** Standard error body shape used across all API surfaces. */
export interface ApiErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
  [key: string]: unknown;
}

/** A returned response is always 2xx — non-2xx throws ServiceError, so data is always present. */
export type ApiResult<T> = ApiResponse<T> & { data: T };

/** Whether an action is currently allowed, with a plain-language reason when it is not. */
export interface ActionGate {
  allowed: boolean;
  reason?: string;
}
