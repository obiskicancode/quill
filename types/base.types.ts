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
