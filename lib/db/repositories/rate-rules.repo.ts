import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { rateRules } from '@/db/schema';
import type { NewRateRule, RateRule } from '@/db/types';

export async function listRateRules(roomTypeId?: string): Promise<RateRule[]> {
  if (roomTypeId) {
    return db
      .select()
      .from(rateRules)
      .where(eq(rateRules.roomTypeId, roomTypeId));
  }
  return db.select().from(rateRules);
}

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

export async function getRateRuleById(id: string): Promise<RateRule | null> {
  const [row] = await db
    .select()
    .from(rateRules)
    .where(eq(rateRules.id, id))
    .limit(1);
  return row ?? null;
}

export async function createRateRule(data: NewRateRule): Promise<RateRule> {
  const [row] = await db.insert(rateRules).values(data).returning();
  return row;
}

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

export async function deleteRateRule(id: string): Promise<RateRule | null> {
  const [row] = await db
    .delete(rateRules)
    .where(eq(rateRules.id, id))
    .returning();
  return row ?? null;
}
