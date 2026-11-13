/**
 * Scheduled booking lifecycle jobs. They expire unpaid holds and stale date
 * changes, repair paid reservations that were left in a non-final status, then
 * drain refunds and queued notifications.
 */
import { and, eq, inArray, lt, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  payments,
  reservationChanges,
  reservations,
  reservationStatusHistory,
} from '@/db/schema';
import { processQueuedNotifications } from '@/lib/notifications/worker';
import { logStructured } from '@/lib/observability';
import { isPaymentProviderId } from '@/lib/payments';
import { processPendingProviderRefunds } from '@/lib/payments/refund-worker';

import { completeOnlinePayment } from './store';

/**
 * Expires unpaid online holds whose deadline has passed, leaving paid holds and
 * pay-at-hotel reservations untouched. Returns the number of reservations
 * expired.
 */
export async function expireStaleHolds(): Promise<number> {
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      UPDATE reservations r
      SET status = 'expired', updated_at = now()
      WHERE r.status = 'pending'
        AND r.hold_expires_at IS NOT NULL
        AND r.hold_expires_at < now()
        AND r.payment_mode <> 'pay_at_hotel'
        AND NOT EXISTS (
          SELECT 1 FROM payments p
          WHERE p.reservation_id = r.id AND p.status = 'paid'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM payment_proofs pp
          JOIN payments p ON p.id = pp.payment_id
          WHERE p.reservation_id = r.id
        )
      RETURNING r.id, r.reference
    `);
    const rows = result.rows as { id: string; reference: string }[];
    if (rows.length > 0)
      await tx.insert(reservationStatusHistory).values(
        rows.map((row) => ({
          reservationId: row.id,
          fromStatus: 'pending' as const,
          toStatus: 'expired' as const,
          reason: 'hold_expired',
        })),
      );
    if (rows.length > 0)
      logStructured('lifecycle.holds_expired', { count: rows.length });
    return rows.length;
  });
}

/** Expires unpaid date-change requests whose hold has lapsed. */
export async function expireStaleChanges(): Promise<number> {
  const rows = await db
    .update(reservationChanges)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        inArray(reservationChanges.status, [
          'awaiting_payment',
          'awaiting_transfer',
          'payment_failed',
        ]),
        lt(reservationChanges.holdExpiresAt, new Date()),
        ne(reservationChanges.status, 'awaiting_verification'),
      ),
    )
    .returning({ id: reservationChanges.id });
  if (rows.length > 0)
    logStructured('lifecycle.changes_expired', { count: rows.length });
  return rows.length;
}

/**
 * Re-applies paid provider payments to reservations that are still pending,
 * expired or cancelled, repairing the common case where a webhook arrived after
 * the reservation was retired. Returns how many reservations were repaired.
 */
export async function reconcilePaidPayments(): Promise<number> {
  const rows = await db
    .select({
      reference: payments.reference,
      provider: payments.provider,
      amountMinor: payments.amountMinor,
    })
    .from(payments)
    .innerJoin(reservations, eq(reservations.id, payments.reservationId))
    .where(
      and(
        eq(payments.status, 'paid'),
        ne(payments.type, 'refund'),
        inArray(reservations.status, ['pending', 'expired', 'cancelled']),
      ),
    )
    .limit(200);

  let repaired = 0;
  for (const row of rows) {
    if (!isPaymentProviderId(row.provider)) continue;
    const result = await completeOnlinePayment({
      provider: row.provider,
      reference: row.reference,
      amountMinor: row.amountMinor,
      payload: { source: 'lifecycle_reconciliation' },
    });
    if (result.ok) repaired += 1;
  }
  if (repaired > 0)
    logStructured('lifecycle.payments_reconciled', { count: repaired });
  return repaired;
}

/**
 * Runs every lifecycle job in order and returns the per-job counts for the cron
 * response and logs.
 */
export async function runLifecycleJobs() {
  const expiredHolds = await expireStaleHolds();
  const expiredChanges = await expireStaleChanges();
  const reconciledPayments = await reconcilePaidPayments();
  const processedRefunds = await processPendingProviderRefunds();
  const sentNotifications = await processQueuedNotifications();
  return {
    expiredHolds,
    expiredChanges,
    reconciledPayments,
    processedRefunds,
    sentNotifications,
  };
}
