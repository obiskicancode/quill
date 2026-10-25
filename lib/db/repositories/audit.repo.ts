import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { auditLogs, seedRecords } from '@/db/schema';
import type {
  AuditLog,
  NewAuditLog,
  NewSeedRecord,
  SeedRecord,
} from '@/db/types';

export async function createAuditLog(data: NewAuditLog): Promise<AuditLog> {
  const [row] = await db.insert(auditLogs).values(data).returning();
  return row;
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
