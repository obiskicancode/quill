import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import type { ApiResult, ApiResponse } from '@/types/base.types';

import { apiClient } from '../axiosInstance';
import { RetryService } from './retry.service';

/** The original error body (code, fieldErrors, …) preserved inside the envelope's `data`. */
export interface ServiceErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
  [key: string]: unknown;
}

/** The single error type every service throws. `status` is 0 for network failures. */
export class ServiceError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: ServiceErrorBody | null = null,
    public network = false,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/** Retries only network failures and 5xx. All state-changing calls carry idempotency keys, so this is safe. */
const RETRY_POLICY = {
  retries: 3,
  delay: 500,
  shouldRetry: (error: unknown) => error instanceof ServiceError && (error.network || error.status >= 500),
};

export default abstract class BaseService {
  protected clientUrl: string;
  private retry = new RetryService();

  constructor(url: string) {
    this.clientUrl = url;
  }

  protected buildUrl(endpoint = ''): string {
    if (!endpoint) return this.clientUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.clientUrl}${cleanEndpoint}`;
  }

  protected async handleRequest<IResponse>(
    request: () => Promise<AxiosResponse<unknown>>,
  ): Promise<ApiResult<IResponse>> {
    return this.retry.execute(async () => {
      try {
        const response = await request();
        return response.data as ApiResult<IResponse>;
      } catch (error) {
        throw this.toServiceError(error);
      }
    }, RETRY_POLICY);
  }

  private toServiceError(error: unknown): ServiceError {
    const defaultMessage = 'An unexpected error occurred. Please try again later.';

    if (error instanceof AxiosError) {
      const envelope = error.response?.data as ApiResponse<unknown> | undefined;
      const body =
        envelope && typeof envelope === 'object' && 'data' in envelope
          ? (envelope.data as ServiceErrorBody | null) ?? null
          : null;
      const message =
        (typeof envelope?.message === 'string' && envelope.message) ||
        (error.response?.data && typeof error.response.data === 'string' ? error.response.data : null) ||
        error.message ||
        defaultMessage;
      return new ServiceError(message, error.response?.status ?? 0, body, !error.response);
    }

    if (error instanceof Error) {
      return new ServiceError(error.message, 0, null, true);
    }

    return new ServiceError(defaultMessage, 0, null, true);
  }

  public handleError(error: unknown): string {
    return this.toServiceError(error).message;
  }

  protected httpGet<IResponse>(url = '', config?: AxiosRequestConfig) {
    return this.handleRequest<IResponse>(() => apiClient.get(this.buildUrl(url), config));
  }

  protected httpPost<IRequest, IResponse>(url = '', data?: IRequest, config?: AxiosRequestConfig) {
    return this.handleRequest<IResponse>(() => apiClient.post(this.buildUrl(url), data, config));
  }

  protected httpPatch<IRequest, IResponse>(url = '', data?: IRequest, config?: AxiosRequestConfig) {
    return this.handleRequest<IResponse>(() => apiClient.patch(this.buildUrl(url), data, config));
  }

  protected httpPut<IRequest, IResponse>(url = '', data?: IRequest, config?: AxiosRequestConfig) {
    return this.handleRequest<IResponse>(() => apiClient.put(this.buildUrl(url), data, config));
  }

  protected httpDelete<IResponse>(url = '', config?: AxiosRequestConfig) {
    return this.handleRequest<IResponse>(() => apiClient.delete(this.buildUrl(url), config));
  }
}

export type { ApiResponse, ApiResult };
