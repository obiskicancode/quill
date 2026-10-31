import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  paymentProofs,
  payments,
  reservationChanges,
  reservations,
  reservationStatusHistory,
} from '@/db/schema';
import { logStructured } from '@/lib/observability';

interface RollbackPaymentInitInput {
  reservationId: string;
  changeId?: string | null;
  reason: string;
}

interface RollbackPaymentInitResult {
  released: boolean;
  skipped?: 'already_paid' | 'not_pending' | 'proof_uploaded';
}

const paymentTypes = ['deposit', 'balance', 'full'] as const;
const activeChangeStatuses = ['awaiting_payment', 'awaiting_transfer'] as const;

/**
 * Releases whatever a failed online-payment initialization was holding. Payment
 * rows are marked failed instead of deleted so a late provider webhook can still
 * be reconciled and refunded if the provider did create a transaction.
 */
export async function rollbackFailedPaymentInit({
  reservationId,
  changeId,
  reason,
}: RollbackPaymentInitInput): Promise<RollbackPaymentInitResult> {
  const result = await db.transaction(
    async (tx): Promise<RollbackPaymentInitResult> => {
      const paymentRows = await tx
        .select({
          id: payments.id,
          status: payments.status,
          note: payments.note,
        })
        .from(payments)
        .where(eq(payments.reservationId, reservationId))
        .orderBy(payments.id)
        .for('update');

      const [reservation] = await tx
        .select({ id: reservations.id, status: reservations.status })
        .from(reservations)
        .where(eq(reservations.id, reservationId))
        .limit(1)
        .for('update');

      if (!reservation) return { released: false };

      const paid = paymentRows.some(
        (payment) =>
          payment.status === 'paid' && (!changeId || payment.note === changeId),
      );
      if (paid) return { released: false, skipped: 'already_paid' };

      if (changeId) {
        const [change] = await tx
          .select({
            id: reservationChanges.id,
            status: reservationChanges.status,
          })
          .from(reservationChanges)
          .where(
            and(
              eq(reservationChanges.id, changeId),
              eq(reservationChanges.reservationId, reservationId),
            ),
          )
          .limit(1)
          .for('update');

        if (!change) return { released: true, skipped: 'not_pending' };
        if (change.status === 'awaiting_verification')
          return { released: false, skipped: 'proof_uploaded' };

        await tx
          .update(payments)
          .set({
            status: 'failed',
            failedAt: new Date(),
            providerResponse: { reason, source: 'payment_init_failed' },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(payments.reservationId, reservationId),
              eq(payments.status, 'pending'),
              eq(payments.note, changeId),
              inArray(payments.type, paymentTypes),
            ),
          );

        if (
          !activeChangeStatuses.includes(
            change.status as (typeof activeChangeStatuses)[number],
          )
        )
          return { released: true, skipped: 'not_pending' };

        await tx
          .update(reservationChanges)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(reservationChanges.id, changeId));

        return { released: true };
      }

      if (reservation.status !== 'pending') {
        const released =
          reservation.status === 'expired' ||
          reservation.status === 'cancelled';
        return { released, skipped: 'not_pending' };
      }

      const [proof] = await tx
        .select({ id: paymentProofs.id })
        .from(paymentProofs)
        .innerJoin(payments, eq(payments.id, paymentProofs.paymentId))
        .where(eq(payments.reservationId, reservationId))
        .limit(1);
      if (proof) return { released: false, skipped: 'proof_uploaded' };

      await tx
        .update(payments)
        .set({
          status: 'failed',
          failedAt: new Date(),
          providerResponse: { reason, source: 'payment_init_failed' },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(payments.reservationId, reservationId),
            eq(payments.status, 'pending'),
            inArray(payments.type, paymentTypes),
          ),
        );

      await tx
        .update(reservations)
        .set({
          status: 'expired',
          holdExpiresAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reservations.id, reservationId),
            eq(reservations.status, 'pending'),
          ),
        );

      await tx.insert(reservationStatusHistory).values({
        reservationId,
        fromStatus: 'pending',
        toStatus: 'expired',
        reason,
        metadata: { type: 'payment_init_failed' },
      });

      return { released: true };
    },
  );

  logStructured('payment.init_rollback', {
    reservationId,
    changeId: changeId ?? null,
    reason,
    ...result,
  });

  return result;
}
