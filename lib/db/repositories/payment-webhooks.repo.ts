/**
 * Storage for inbound payment-provider webhook events, used to record and
 * de-duplicate deliveries.
 */
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { paymentWebhookEvents } from '@/db/schema';
import type { NewPaymentWebhookEvent, PaymentWebhookEvent } from '@/db/types';

/**
 * Finds a provider event by its provider-scoped event id, or `null` when absent.
 */
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

/** Inserts a webhook event and returns the created row. */
export async function createWebhookEvent(
  data: NewPaymentWebhookEvent,
): Promise<PaymentWebhookEvent> {
  const [row] = await db.insert(paymentWebhookEvents).values(data).returning();
  return row;
}

/**
 * Marks an event processed, or records an error and leaves it unprocessed so it
 * can be retried; returns `null` when the event is missing.
 */
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
