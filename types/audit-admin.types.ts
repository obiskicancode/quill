import { z } from 'zod';

import type { AdminRole } from '@/lib/auth/permissions';

export const AuditPresetFilter = z.enum([
  'all',
  'rates',
  'payments',
  'bank_accounts',
  'staff_security',
  'cancellations',
]);

export type AuditPreset = z.infer<typeof AuditPresetFilter>;

export const AuditQuerySchema = z.object({
  actor: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  action: z.string().trim().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().trim().optional(),
  preset: AuditPresetFilter.default('all'),
  sort: z.enum(['created_at', 'action', 'entity']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type AuditQueryParams = z.infer<typeof AuditQuerySchema>;

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
