import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { auditLogs, seedRecords } from '@/db/schema';
import type {
  AuditLog,
  NewAuditLog,
  NewSeedRecord,
  SeedRecord,
} from '@/db/types';
import type { AdminRole } from '@/lib/auth/permissions';

export async function createAuditLog(data: NewAuditLog): Promise<AuditLog> {
  const [row] = await db.insert(auditLogs).values(data).returning();
  return row;
}

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

export async function listAuditLogs(limit = 100): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

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

export async function createSeedRecord(
  data: NewSeedRecord,
): Promise<SeedRecord> {
  const [row] = await db.insert(seedRecords).values(data).returning();
  return row;
}

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
