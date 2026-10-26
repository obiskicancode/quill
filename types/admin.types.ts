import type { AdminRole, Permission } from '@/lib/auth/permissions';

export interface AdminStaff {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  phone: string | null;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
}

export interface AdminSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AdminAuthResult {
  mfaRequired?: boolean;
  setupRequired?: boolean;
  redirectTo?: string;
}

export interface AdminAccountResponse {
  staff: AdminStaff;
  role: AdminRole;
  permissions: readonly Permission[];
  mfaPending: boolean;
  canSetupMfa: boolean;
}

export interface AdminMfaSetupResponse {
  qrCodeDataUrl: string;
  manualKey: string;
}

export interface AdminRecoveryCodesResponse {
  recoveryCodes: string[];
}

export interface AdminSessionsResponse {
  sessions: AdminSession[];
}

export interface AdminRevokeResponse {
  revoked: number;
}

export interface AdminPermissionView {
  role: AdminRole;
  permissions: readonly Permission[];
}
