/**
 * Audit-log and seed-record persistence. Audit writes are append-only; the
 * seed registry records which fixture rows were inserted.
 */

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { auditLogs, seedRecords } from '@/db/schema';
import type {
  AuditLog,
  NewAuditLog,
  NewSeedRecord,
  SeedRecord,
} from '@/db/types';
import type { AdminRole } from '@/types/auth.types';

/** Inserts one audit row. */
export async function createAuditLog(data: NewAuditLog): Promise<AuditLog> {
  const [row] = await db.insert(auditLogs).values(data).returning();
  return row;
}

/** Records an audit event with optional actor, reason, diff and request metadata. */
export async function recordAuditLog(data: {
  actorId?: string | null;
  actorRole?: AdminRole | null;
  entity: string;
  entityId: string;
  action: string;
  reason?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<AuditLog> {
  return createAuditLog({
    actorId: data.actorId ?? null,
    actorRole: data.actorRole ?? null,
    entity: data.entity,
    entityId: data.entityId,
    action: data.action,
    reason: data.reason ?? null,
    changes: data.changes ?? null,
    ipAddress: data.ipAddress ?? null,
    userAgent: data.userAgent ?? null,
  });
}

/** Lists the newest audit rows, up to `limit`. */
export async function listAuditLogs(limit = 100): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/** Lists the audit history for one entity, newest first. */
export async function listAuditLogsForEntity(
  entity: string,
  entityId: string,
): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.entity, entity), eq(auditLogs.entityId, entityId)))
    .orderBy(desc(auditLogs.createdAt));
}

/** Records a seeded fixture row so re-seeding can detect it. */
export async function createSeedRecord(
  data: NewSeedRecord,
): Promise<SeedRecord> {
  const [row] = await db.insert(seedRecords).values(data).returning();
  return row;
}

/** Finds a seeded fixture record by table name and row id. */
export async function findSeedRecord(
  tableName: string,
  rowId: string,
): Promise<SeedRecord | null> {
  const [row] = await db
    .select()
    .from(seedRecords)
    .where(
      and(eq(seedRecords.tableName, tableName), eq(seedRecords.rowId, rowId)),
    )
    .limit(1);
  return row ?? null;
}
