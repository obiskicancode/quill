import { createAuditLog } from '../db/repositories/audit.repo';
import type { AdminRole } from './permissions';

interface AuditInput {
  actorId?: string | null;
  actorRole?: AdminRole | null;
  entity?: string;
  entityId: string;
  action: string;
  reason?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function writeAdminAudit(input: AuditInput): Promise<void> {
  try {
    await createAuditLog({
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      entity: input.entity ?? 'staff',
      entityId: input.entityId,
      action: input.action,
      reason: input.reason ?? null,
      changes: input.changes ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (error) {
    console.error('Admin audit write failed', {
      action: input.action,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
