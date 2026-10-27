import type {
  AuditPreset as AuditPresetSchema,
  AuditQueryParams as AuditQueryParamsSchema,
} from '@/schemas/audit-admin.schema';
import type { AdminRole } from '@/types/auth.types';

export type AuditPreset = AuditPresetSchema;
export type AuditQueryParams = AuditQueryParamsSchema;

export interface AuditListItem {
  id: string;
  createdAt: string;
  utcTime: string;
  actorId: string | null;
  actorName: string;
  actorRole: AdminRole | 'guest' | 'system';
  action: string;
  entity: string;
  entityId: string;
  entityRef: string | null;
  entityLink: string | null;
  summary: string;
  ipAddress: string | null; // owner only, null for manager
}

export interface AuditDiffField {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface AuditDetailResponse {
  id: string;
  createdAt: string;
  utcTime: string;
  actorId: string | null;
  actorName: string;
  actorRole: AdminRole | 'guest' | 'system';
  action: string;
  entity: string;
  entityId: string;
  entityRef: string | null;
  entityLink: string | null;
  isEntityAvailable: boolean;
  reason: string | null;
  diffs: AuditDiffField[];
  ipAddress: string | null; // owner only
  userAgent: string | null; // owner only
}
