/**
 * Persistence helpers for bookable extras, including slug lookup and
 * active-only listing.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { extras } from '@/db/schema';
import type { Extra, NewExtra } from '@/db/types';

/** Lists extras, limited to active ones by default. */
export async function listExtras(activeOnly = true): Promise<Extra[]> {
  if (activeOnly) {
    return db.select().from(extras).where(eq(extras.isActive, true));
  }
  return db.select().from(extras);
}

/** Finds an extra by id, or `null` when absent. */
export async function getExtraById(id: string): Promise<Extra | null> {
  const [row] = await db
    .select()
    .from(extras)
    .where(eq(extras.id, id))
    .limit(1);
  return row ?? null;
}

/** Finds an extra by its unique slug, or `null` when absent. */
export async function getExtraBySlug(slug: string): Promise<Extra | null> {
  const [row] = await db
    .select()
    .from(extras)
    .where(eq(extras.slug, slug))
    .limit(1);
  return row ?? null;
}

/** Inserts an extra and returns the created row. */
export async function createExtra(data: NewExtra): Promise<Extra> {
  const [row] = await db.insert(extras).values(data).returning();
  return row;
}

/**
 * Partially updates an extra, stamping `updatedAt`; returns `null` when no row
 * matched.
 */
export async function updateExtra(
  id: string,
  data: Partial<NewExtra>,
): Promise<Extra | null> {
  const [row] = await db
    .update(extras)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(extras.id, id))
    .returning();
  return row ?? null;
}

/** Deletes an extra and returns the removed row, or `null` when absent. */
export async function deleteExtra(id: string): Promise<Extra | null> {
  const [row] = await db.delete(extras).where(eq(extras.id, id)).returning();
  return row ?? null;
}
