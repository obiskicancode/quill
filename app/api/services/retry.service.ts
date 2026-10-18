import type { IRetryOptions } from "@/types/base.types";

export class RetryService {
  async execute<T>(
    operation: () => Promise<T>,
    options?: IRetryOptions,
  ): Promise<T> {
    const retries = options?.retries ?? 3;
    const delay = options?.delay ?? 1000;

    const shouldRetry = options?.shouldRetry ?? (() => true);

    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!shouldRetry(error)) {
          throw error;
        }

        if (attempt < retries) {
          const jitter = Math.random() * 200;
          const backoff = delay * Math.pow(2, attempt - 1);
          const providerMinimum =
            options?.minimumDelayForError?.(error, attempt) ?? 0;
          await this.sleep(Math.max(backoff + jitter, providerMinimum));
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
