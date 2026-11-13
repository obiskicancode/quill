/**
 * Admin audit helper. Audit writes are best-effort: a logging failure is
 * reported to the server log but never turns a successful action into an error
 * for the operator.
 */
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { AdminRole } from '@/types/auth.types';

import { createAuditLog } from '../db/repositories/audit.repo';

/** Fields recorded for one audited staff action. */
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

/**
 * Records an audit entry, defaulting the entity to `staff`. Failures are
 * logged and swallowed so audit availability never blocks the action itself.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
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
    console.error(ERROR_MESSAGES.ADMIN_AUDIT_FAILED, {
      action: input.action,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
