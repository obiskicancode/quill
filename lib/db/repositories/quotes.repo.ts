import { eq, lt } from 'drizzle-orm';

import { db } from '@/db';
import { quotes } from '@/db/schema';
import type { NewQuote, Quote } from '@/db/types';

export async function saveQuote(q: Quote): Promise<void> {
  await db.insert(quotes).values({
    id: q.id,
    reference: q.reference,
    checkIn: q.checkIn,
    checkOut: q.checkOut,
    breakdown: q.breakdown as unknown as Record<string, unknown>,
    oldTotalMinor: q.oldTotalMinor,
    newTotalMinor: q.newTotalMinor,
    settle: q.settle,
    roomReassigned: q.roomReassigned,
    policy: q.policy as unknown as Record<string, unknown>,
    expiresAt: new Date(q.expiresAt),
  });
}

export async function createQuote(data: NewQuote): Promise<Quote> {
  const [row] = await db.insert(quotes).values(data).returning();
  return row;
}

export async function getQuote(id: string): Promise<Quote | null> {
  const [row] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt < new Date()) return null;

  return row;
}

export async function consumeQuote(id: string): Promise<void> {
  await db.delete(quotes).where(eq(quotes.id, id));
}

export async function cleanupExpiredQuotes(): Promise<void> {
  await db.delete(quotes).where(lt(quotes.expiresAt, new Date()));
}
