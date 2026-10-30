import { and, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';

import { config } from '@/config';
import { db } from '@/db';
import { notificationLogs } from '@/db/schema';
import { logStructured } from '@/lib/observability';

const MAX_ATTEMPTS = 5;
const RETRY_AFTER_MS = 5 * 60 * 1000;

/**
 * Sends queued email notifications through the configured delivery webhook.
 * Without a webhook the queue is left untouched so nothing is silently dropped.
 */
export async function processQueuedNotifications(): Promise<number> {
  const url = config.NOTIFICATIONS.WEBHOOK_URL?.trim();
  if (!url) return 0;

  const retryBefore = new Date(Date.now() - RETRY_AFTER_MS);
  const rows = await db
    .select()
    .from(notificationLogs)
    .where(
      and(
        eq(notificationLogs.status, 'queued'),
        eq(notificationLogs.channel, 'email'),
        lte(notificationLogs.attempts, MAX_ATTEMPTS - 1),
        or(
          isNull(notificationLogs.lastAttemptAt),
          lt(notificationLogs.lastAttemptAt, retryBefore),
        ),
      ),
    )
    .orderBy(notificationLogs.createdAt)
    .limit(25);

  let sent = 0;
  for (const notification of rows) {
    const [claimed] = await db
      .update(notificationLogs)
      .set({
        attempts: sql`${notificationLogs.attempts} + 1`,
        lastAttemptAt: new Date(),
      })
      .where(
        and(
          eq(notificationLogs.id, notification.id),
          eq(notificationLogs.status, 'queued'),
          eq(notificationLogs.attempts, notification.attempts),
        ),
      )
      .returning({ id: notificationLogs.id });
    if (!claimed) continue;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notification.id,
          reservationId: notification.reservationId,
          templateKey: notification.templateKey,
          to: notification.recipient,
          subject: notification.subject,
          body: notification.body,
          dedupeKey: notification.dedupeKey,
          createdAt: notification.createdAt.toISOString(),
        }),
      });
      if (!response.ok)
        throw new Error(`notification webhook returned ${response.status}`);

      await db
        .update(notificationLogs)
        .set({
          status: 'sent',
          sentAt: new Date(),
          error: null,
        })
        .where(eq(notificationLogs.id, notification.id));
      sent += 1;
    } catch (error) {
      const attempts = notification.attempts + 1;
      await db
        .update(notificationLogs)
        .set({
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
          error: (error instanceof Error ? error.message : 'send failed').slice(
            0,
            500,
          ),
        })
        .where(eq(notificationLogs.id, notification.id));
      logStructured(
        'notification.send_failed',
        {
          id: notification.id,
          attempts,
          error: error instanceof Error ? error.message : 'unknown',
        },
        'warn',
      );
    }
  }

  if (sent > 0) logStructured('notification.sent', { count: sent });
  return sent;
}
