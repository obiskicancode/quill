import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { paymentWebhookEvents } from '@/db/schema';
import type { NewPaymentWebhookEvent, PaymentWebhookEvent } from '@/db/types';

export async function findWebhookEvent(
  provider: string,
  eventId: string,
): Promise<PaymentWebhookEvent | null> {
  const [row] = await db
    .select()
    .from(paymentWebhookEvents)
    .where(
      and(
        eq(
          paymentWebhookEvents.provider,
          provider as (typeof paymentWebhookEvents.provider.enumValues)[number],
        ),
        eq(paymentWebhookEvents.eventId, eventId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createWebhookEvent(
  data: NewPaymentWebhookEvent,
): Promise<PaymentWebhookEvent> {
  const [row] = await db.insert(paymentWebhookEvents).values(data).returning();
  return row;
}

export async function markWebhookProcessed(
  id: string,
  error?: string | null,
): Promise<PaymentWebhookEvent | null> {
  const [row] = await db
    .update(paymentWebhookEvents)
    .set({
      processed: error ? false : true,
      processedAt: error ? null : new Date(),
      error: error ?? null,
    })
    .where(eq(paymentWebhookEvents.id, id))
    .returning();
  return row ?? null;
}
