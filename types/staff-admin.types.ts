import type {
  StaffInviteInput as StaffInviteInputSchema,
  StaffQueryParams as StaffQueryParamsSchema,
  StaffUpdateInput as StaffUpdateInputSchema,
  StepUpAuthInput as StepUpAuthInputSchema,
} from '@/schemas/staff-admin.schema';
import type { AdminRole } from '@/types/auth.types';

export type StaffStatus = 'active' | 'invited' | 'deactivated' | 'locked';

export type StaffInviteInput = StaffInviteInputSchema;
export type StaffUpdateInput = StaffUpdateInputSchema;
export type StaffQueryParams = StaffQueryParamsSchema;

export interface StaffListItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: AdminRole;
  status: StaffStatus;
  phone: string | null;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  invitedAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffSessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
}

export interface StaffAuditItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface StaffDetailResponse extends StaffListItem {
  invitedByName: string | null;
  deactivatedByName: string | null;
  activeSessions: StaffSessionItem[];
  recentAudits: StaffAuditItem[];
}

export type StepUpAuthInput = StepUpAuthInputSchema;
