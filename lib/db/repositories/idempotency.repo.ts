import { eq, lt } from 'drizzle-orm';

import { db } from '@/db';
import { idempotencyKeys } from '@/db/schema';
import type { IdempotencyKey, NewIdempotencyKey } from '@/db/types';

export async function getIdempotency(
  key: string,
): Promise<unknown | IdempotencyKey['response']> {
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt < new Date()) return null;
  return row.response;
}

export async function getIdempotencyRecord(
  key: string,
): Promise<IdempotencyKey | null> {
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt < new Date()) return null;
  return row;
}

export async function setIdempotency(
  key: string,
  response: unknown,
  statusCode?: number,
  ttlMinutes = 60,
  extra?: Partial<NewIdempotencyKey>,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await db
    .insert(idempotencyKeys)
    .values({
      key,
      response: response as IdempotencyKey['response'],
      statusCode: statusCode ?? 200,
      expiresAt,
      ...extra,
    })
    .onConflictDoNothing();
}

export async function cleanupExpired(): Promise<void> {
  await db
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.expiresAt, new Date()));
}
