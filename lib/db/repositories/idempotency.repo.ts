/**
 * Idempotency-key storage for safe request retries. Records hold a stored
 * response and an expiry; expired rows are treated as absent. `claim*` reserves
 * a key before work begins and `finish*` stores the result.
 */
import { and, eq, isNull, lt } from 'drizzle-orm';

import { db } from '@/db';
import { idempotencyKeys } from '@/db/schema';
import type { IdempotencyKey, NewIdempotencyKey } from '@/db/types';

/** A `db` handle or the transaction passed by a caller that owns one. */
type QueryExecutor = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;

/**
 * Returns a stored response, deleting the record first if it has expired;
 * resolves to `null` when absent or expired.
 */
export async function getIdempotency(
  key: string,
): Promise<unknown | IdempotencyKey['response']> {
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt < new Date()) {
    await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, key));
    return null;
  }
  return row.response;
}

/**
 * Returns the full record through `executor`, deleting it first if expired.
 */
export async function getIdempotencyRecord(
  key: string,
  executor: QueryExecutor = db,
): Promise<IdempotencyKey | null> {
  const [row] = await executor
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt < new Date()) {
    await executor.delete(idempotencyKeys).where(eq(idempotencyKeys.key, key));
    return null;
  }
  return row;
}

/**
 * Stores a response, first pruning any expired row for the same key. Conflicts
 * with a live key are ignored so the first stored value wins.
 */
export async function setIdempotency(
  key: string,
  response: unknown,
  statusCode?: number,
  ttlMinutes = 60,
  extra?: Partial<NewIdempotencyKey>,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await db
    .delete(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, key),
        lt(idempotencyKeys.expiresAt, new Date()),
      ),
    );
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

/**
 * Atomically tries to insert a claim before work runs. When another request
 * already holds the key, returns `claimed: false` with its record; a second
 * insert retries the claim if that record expired between the conflict and the
 * re-read.
 */
export async function claimIdempotency(
  key: string,
  ttlSeconds = 120,
  extra?: Partial<NewIdempotencyKey>,
  executor: QueryExecutor = db,
): Promise<{ claimed: boolean; record: IdempotencyKey | null }> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const [inserted] = await executor
    .insert(idempotencyKeys)
    .values({
      key,
      response: null,
      statusCode: 0,
      expiresAt,
      ...extra,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) return { claimed: true, record: inserted };

  const existing = await getIdempotencyRecord(key, executor);
  if (existing) return { claimed: false, record: existing };

  const [retried] = await executor
    .insert(idempotencyKeys)
    .values({
      key,
      response: null,
      statusCode: 0,
      expiresAt,
      ...extra,
    })
    .onConflictDoNothing()
    .returning();
  return { claimed: Boolean(retried), record: retried ?? null };
}

/**
 * Completes a claim by storing its response and resetting the expiry.
 */
export async function finishIdempotency(
  key: string,
  response: unknown,
  statusCode = 200,
  ttlMinutes = 60,
  extra?: Partial<NewIdempotencyKey>,
  executor: QueryExecutor = db,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await executor
    .update(idempotencyKeys)
    .set({
      response: response as IdempotencyKey['response'],
      statusCode,
      expiresAt,
      ...extra,
    })
    .where(eq(idempotencyKeys.key, key));
}

/**
 * Deletes an unfinished claim, leaving completed records intact.
 */
export async function releaseIdempotency(
  key: string,
  executor: QueryExecutor = db,
): Promise<void> {
  await executor
    .delete(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, key), isNull(idempotencyKeys.response)));
}

/**
 * Drops a finished record on purpose. `releaseIdempotency` only abandons an
 * unfinished claim, so a reply the caller has just proven unusable — the hold behind
 * it expired — needs a retire that also removes the stored response.
 */
export async function retireIdempotency(
  key: string,
  executor: QueryExecutor = db,
): Promise<void> {
  await executor.delete(idempotencyKeys).where(eq(idempotencyKeys.key, key));
}

/** Deletes every expired record. */
export async function cleanupExpired(): Promise<void> {
  await db
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.expiresAt, new Date()));
}
