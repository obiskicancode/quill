import { ApiResponse } from './base.types';

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export interface AuthResponse<T> extends ApiResponse<T> {
  tokens: AuthTokens | null;
}
