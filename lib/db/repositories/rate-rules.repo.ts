/**
 * Persistence and date-range lookup for room-type rate rules.
 */
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { rateRules } from '@/db/schema';
import type { NewRateRule, RateRule } from '@/db/types';

/** Lists rate rules, optionally filtered by room type. */
export async function listRateRules(roomTypeId?: string): Promise<RateRule[]> {
  if (roomTypeId) {
    return db
      .select()
      .from(rateRules)
      .where(eq(rateRules.roomTypeId, roomTypeId));
  }
  return db.select().from(rateRules);
}

/** Lists active rate rules, optionally filtered by room type. */
export async function listActiveRateRules(
  roomTypeId?: string,
): Promise<RateRule[]> {
  const conditions = [eq(rateRules.isActive, true)];
  if (roomTypeId) {
    conditions.push(eq(rateRules.roomTypeId, roomTypeId));
  }
  return db
    .select()
    .from(rateRules)
    .where(and(...conditions));
}

/**
 * Finds active rules for a room type covering `date`, using an inclusive date
 * range.
 */
export async function findApplicableRateRules(
  roomTypeId: string,
  date: string,
): Promise<RateRule[]> {
  return db
    .select()
    .from(rateRules)
    .where(
      and(
        eq(rateRules.isActive, true),
        eq(rateRules.roomTypeId, roomTypeId),
        sql`${rateRules.startDate} <= ${date}::date`,
        sql`${rateRules.endDate} >= ${date}::date`,
      ),
    );
}

/** Finds a rate rule by id, or `null` when absent. */
export async function getRateRuleById(id: string): Promise<RateRule | null> {
  const [row] = await db
    .select()
    .from(rateRules)
    .where(eq(rateRules.id, id))
    .limit(1);
  return row ?? null;
}

/** Inserts a rate rule and returns the created row. */
export async function createRateRule(data: NewRateRule): Promise<RateRule> {
  const [row] = await db.insert(rateRules).values(data).returning();
  return row;
}

/**
 * Partially updates a rate rule, stamping `updatedAt`; returns `null` when no
 * row matched.
 */
export async function updateRateRule(
  id: string,
  data: Partial<NewRateRule>,
): Promise<RateRule | null> {
  const [row] = await db
    .update(rateRules)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(rateRules.id, id))
    .returning();
  return row ?? null;
}

/** Deletes a rate rule and returns the removed row, or `null` when absent. */
export async function deleteRateRule(id: string): Promise<RateRule | null> {
  const [row] = await db
    .delete(rateRules)
    .where(eq(rateRules.id, id))
    .returning();
  return row ?? null;
}
