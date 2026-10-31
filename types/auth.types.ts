import { Staff } from './staff.types';

export type AdminRole = 'owner' | 'manager' | 'reception';

export type Permission =
  | 'dashboard.view'
  | 'revenue.view'
  | 'reservations.view'
  | 'reservations.manage'
  | 'reservations.create'
  | 'reservations.edit_details'
  | 'reservations.reassign_room'
  | 'reservations.resend'
  | 'reservations.no_show'
  | 'reservations.discount'
  | 'reservations.change_dates'
  | 'reservations.cancel'
  | 'reservations.approve'
  | 'guest.contact.view'
  | 'calendar.view'
  | 'calendar.block'
  | 'blocks.restricted_reasons'
  | 'blocks.backdate'
  | 'enquiries.view'
  | 'enquiries.manage'
  | 'enquiries.anonymise'
  | 'rooms.view'
  | 'rooms.manage'
  | 'rates.manage'
  | 'extras.manage'
  | 'amenities.manage'
  | 'content.manage'
  | 'payments.view'
  | 'payments.manage'
  | 'payments.record'
  | 'payments.verify'
  | 'payments.refund'
  | 'settings.hotel.manage'
  | 'settings.payments.manage'
  | 'staff.manage'
  | 'audit.view';
export interface AdminIdentity {
  firstName: string;
  lastName: string;
  email: string;
}

export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AuthResult {
  mfaRequired?: boolean;
  setupRequired?: boolean;
  redirectTo?: string;
}

export interface AccountResponse {
  staff: Staff;
  role: AdminRole;
  permissions: readonly Permission[];
  mfaPending: boolean;
  canSetupMfa: boolean;
}

export interface MfaSetupResponse {
  qrCodeDataUrl: string;
  manualKey: string;
}

export interface RecoveryCodesResponse {
  recoveryCodes: string[];
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface RevokeResponse {
  revoked: number;
}

export interface AdminPermissionView {
  role: AdminRole;
  permissions: readonly Permission[];
}
