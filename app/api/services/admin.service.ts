import type { AxiosRequestConfig } from 'axios';

import type { AdminProfileInput } from '@/schemas/admin-account.schema';
import type {
  AdminForgotPasswordInput,
  AdminLoginInput,
  AdminResetPasswordInput,
  AdminVerify2faInput,
} from '@/schemas/admin-auth.schema';
import type {
  AdminAccountResponse,
  AdminAuthResult,
  AdminMfaSetupResponse,
  AdminRecoveryCodesResponse,
  AdminRevokeResponse,
  AdminSessionsResponse,
  AdminStaff,
} from '@/types/admin.types';

import BaseService from './base.service';

const noRefresh: AxiosRequestConfig = { skipRefresh: true };

class AdminService extends BaseService {
  constructor() {
    super('/admin');
    this.retryPolicy = {
      retries: 1,
      delay: 0,
      shouldRetry: () => false,
    };
  }

  login(body: AdminLoginInput) {
    return this.httpPost<AdminLoginInput, AdminAuthResult>(
      '/auth/login',
      body,
      noRefresh,
    );
  }

  verify2fa(body: AdminVerify2faInput) {
    return this.httpPost<AdminVerify2faInput, AdminAuthResult>(
      '/auth/verify-2fa',
      body,
      noRefresh,
    );
  }

  logout() {
    return this.httpPost<undefined, Record<string, never>>(
      '/auth/logout',
      undefined,
    );
  }

  forgotPassword(body: AdminForgotPasswordInput) {
    return this.httpPost<AdminForgotPasswordInput, { sent: boolean }>(
      '/auth/forgot-password',
      body,
      noRefresh,
    );
  }

  resetPassword(body: AdminResetPasswordInput) {
    return this.httpPost<AdminResetPasswordInput, { redirectTo: string }>(
      '/auth/reset-password',
      body,
      noRefresh,
    );
  }

  getAccount() {
    return this.httpGet<AdminAccountResponse>('/account');
  }

  updateProfile(body: AdminProfileInput) {
    return this.httpPatch<AdminProfileInput, { staff: AdminStaff }>(
      '/account',
      body,
    );
  }

  changePassword(body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return this.httpPost<typeof body, { revokedSessions: number }>(
      '/account/password',
      body,
    );
  }

  setup2fa() {
    return this.httpPost<undefined, AdminMfaSetupResponse>(
      '/account/2fa/setup',
      undefined,
    );
  }

  confirm2fa(body: { code: string }) {
    return this.httpPost<typeof body, AdminRecoveryCodesResponse>(
      '/account/2fa/confirm',
      body,
    );
  }

  disable2fa(body: { password: string }) {
    return this.httpPost<typeof body, { enabled: boolean }>(
      '/account/2fa/disable',
      body,
    );
  }

  rotateRecoveryCodes(body: { password: string }) {
    return this.httpPost<typeof body, AdminRecoveryCodesResponse>(
      '/account/2fa/recovery-codes',
      body,
    );
  }

  getSessions() {
    return this.httpGet<AdminSessionsResponse>('/account/sessions');
  }

  revokeSession(id: string) {
    return this.httpDelete<AdminRevokeResponse>('/account/sessions', {
      data: { id },
    });
  }

  revokeOtherSessions() {
    return this.httpDelete<AdminRevokeResponse>('/account/sessions');
  }
}

export const adminService = new AdminService();
