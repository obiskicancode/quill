import {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { ApiErrorBody, ApiResponse, ApiResult } from '@/types/base.types';

import { apiClient } from '../axiosInstance';
import { RetryService } from './retry.service';

/** The single error type every service throws. `status` is 0 for network failures. */
export class ServiceError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: ApiErrorBody | null = null,
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
  shouldRetry: (error: unknown) =>
    error instanceof ServiceError && (error.network || error.status >= 500),
};

export default abstract class BaseService {
  protected clientUrl: string;
  protected client: AxiosInstance;
  protected retryPolicy = RETRY_POLICY;
  private retry = new RetryService();

  constructor(url: string, client: AxiosInstance = apiClient) {
    this.clientUrl = url;
    this.client = client;
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
    }, this.retryPolicy);
  }

  private toServiceError(error: unknown): ServiceError {
    const defaultMessage = ERROR_MESSAGES.UNEXPECTED_ERROR;

    if (error instanceof AxiosError) {
      const envelope = error.response?.data as ApiResponse<unknown> | undefined;
      const body =
        envelope && typeof envelope === 'object' && 'data' in envelope
          ? ((envelope.data as ApiErrorBody | null) ?? null)
          : null;
      const message =
        (typeof envelope?.message === 'string' && envelope.message) ||
        (error.response?.data && typeof error.response.data === 'string'
          ? error.response.data
          : null) ||
        error.message ||
        defaultMessage;
      return new ServiceError(
        message,
        error.response?.status ?? 0,
        body,
        !error.response,
      );
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
    return this.handleRequest<IResponse>(() =>
      this.client.get(this.buildUrl(url), config),
    );
  }

  protected httpPost<IRequest, IResponse>(
    url = '',
    data?: IRequest,
    config?: AxiosRequestConfig,
  ) {
    return this.handleRequest<IResponse>(() =>
      this.client.post(this.buildUrl(url), data, config),
    );
  }

  protected httpPatch<IRequest, IResponse>(
    url = '',
    data?: IRequest,
    config?: AxiosRequestConfig,
  ) {
    return this.handleRequest<IResponse>(() =>
      this.client.patch(this.buildUrl(url), data, config),
    );
  }

  protected httpPut<IRequest, IResponse>(
    url = '',
    data?: IRequest,
    config?: AxiosRequestConfig,
  ) {
    return this.handleRequest<IResponse>(() =>
      this.client.put(this.buildUrl(url), data, config),
    );
  }

  protected httpDelete<IResponse>(url = '', config?: AxiosRequestConfig) {
    return this.handleRequest<IResponse>(() =>
      this.client.delete(this.buildUrl(url), config),
    );
  }
}

export type { ApiResponse, ApiResult };
