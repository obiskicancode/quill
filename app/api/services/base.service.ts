import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import type { ApiResponse } from '@/types/base.types';

import { apiClient } from '../axiosInstance';

export default abstract class BaseService {
  protected clientUrl: string;

  constructor(url: string) {
    this.clientUrl = url;
  }

  protected buildUrl(endpoint = ''): string {
    if (!endpoint) return this.clientUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.clientUrl}${cleanEndpoint}`;
  }

  protected async handleRequest<IResponse>(
    request: Promise<AxiosResponse<ApiResponse<IResponse>>>,
  ): Promise<ApiResponse<IResponse>> {
    try {
      const response = await request;
      return response.data;
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  public handleError(error: unknown): string {
    const defaultMessage =
      'An unexpected error occurred. Please try again later.';

    if (error instanceof AxiosError) {
      const apiResp = error.response?.data as ApiResponse<unknown> | undefined;
      if (apiResp?.message) {
        return apiResp.message;
      }
      if (error.response?.data && typeof error.response.data === 'string') {
        return error.response.data;
      }
      return error.message || defaultMessage;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return defaultMessage;
  }

  protected get<IResponse>(url = '', config?: AxiosRequestConfig) {
    return this.handleRequest<IResponse>(
      apiClient.get(this.buildUrl(url), config),
    );
  }

  protected post<IRequest, IResponse>(
    url = '',
    data?: IRequest,
    config?: AxiosRequestConfig,
  ) {
    return this.handleRequest<IResponse>(
      apiClient.post(this.buildUrl(url), data, config),
    );
  }

  protected patch<IRequest, IResponse>(
    url = '',
    data?: IRequest,
    config?: AxiosRequestConfig,
  ) {
    return this.handleRequest<IResponse>(
      apiClient.patch(this.buildUrl(url), data, config),
    );
  }

  protected put<IRequest, IResponse>(
    url = '',
    data?: IRequest,
    config?: AxiosRequestConfig,
  ) {
    return this.handleRequest<IResponse>(
      apiClient.put(this.buildUrl(url), data, config),
    );
  }

  protected delete<IResponse>(url = '', config?: AxiosRequestConfig) {
    return this.handleRequest<IResponse>(
      apiClient.delete(this.buildUrl(url), config),
    );
  }
}
