import { and, eq } from 'drizzle-orm';

import type { db } from '@/db';
import { seedRecords } from '@/db/schema';

export type SeedExecutor = Pick<
  typeof db,
  'insert' | 'select' | 'execute' | 'delete'
>;
export type SeedName = 'bootstrap' | 'demo' | 'e2e';

export async function recordSeed(
  executor: SeedExecutor,
  tableName: string,
  rowId: string,
  seedName: SeedName,
): Promise<void> {
  await executor
    .insert(seedRecords)
    .values({ tableName, rowId, seedName })
    .onConflictDoNothing();
}

export async function hasSeedRecord(
  executor: SeedExecutor,
  tableName: string,
  rowId: string,
  seedName: SeedName,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: seedRecords.id })
    .from(seedRecords)
    .where(
      and(
        eq(seedRecords.tableName, tableName),
        eq(seedRecords.rowId, rowId),
        eq(seedRecords.seedName, seedName),
      ),
    )
    .limit(1);
  return Boolean(row);
}
