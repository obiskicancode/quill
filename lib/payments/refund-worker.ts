import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  payments,
  refunds,
  reservations,
  reservationStatusHistory,
} from '@/db/schema';
import { logStructured } from '@/lib/observability';
import { recomputeReservationFinancials } from '@/lib/reservations/payment-ledger';

import { createPaymentProvider as getPaymentProvider } from './factory';
import { isPaymentProviderId } from './provider';

const CLAIM_TTL_MS = 5 * 60 * 1000;

async function releaseClaim(id: string, error: string): Promise<void> {
  await db
    .update(payments)
    .set({
      refundClaimedAt: null,
      refundLastError: error.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(and(eq(payments.id, id), eq(payments.status, 'pending')));
}

export async function processPendingProviderRefunds(): Promise<number> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CLAIM_TTL_MS);

  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.type, 'refund'),
          eq(payments.status, 'pending'),
          inArray(payments.provider, ['paystack', 'flutterwave', 'stripe']),
          isNotNull(payments.refundOfPaymentId),
          or(
            isNull(payments.refundClaimedAt),
            lt(payments.refundClaimedAt, staleBefore),
          ),
        ),
      )
      .orderBy(payments.createdAt)
      .limit(25)
      .for('update', { skipLocked: true });

    if (rows.length === 0) return [];

    await tx
      .update(payments)
      .set({
        refundClaimedAt: now,
        refundAttempts: sql`${payments.refundAttempts} + 1`,
        refundLastError: null,
        updatedAt: now,
      })
      .where(
        inArray(
          payments.id,
          rows.map((row) => row.id),
        ),
      );

    return rows;
  });

  let processed = 0;
  for (const refund of claimed) {
    if (!isPaymentProviderId(refund.provider)) {
      await releaseClaim(refund.id, 'Refund provider is not online');
      continue;
    }
    const [original] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, refund.refundOfPaymentId!))
      .limit(1);
    if (!original) {
      await releaseClaim(refund.id, 'Original payment missing');
      logStructured(
        'refund.original_payment_missing',
        { refund: refund.reference },
        'error',
      );
      continue;
    }

    const provider = getPaymentProvider(refund.provider);
    if (!provider.isConfigured()) {
      await releaseClaim(refund.id, 'Refund provider is not configured');
      logStructured(
        'refund.provider_not_configured',
        { refund: refund.reference, provider: refund.provider },
        'warn',
      );
      continue;
    }

    const ok = await provider
      .refund({
        reference: original.providerRef ?? original.reference,
        amountMinor: refund.amountMinor,
      })
      .catch(() => false);
    if (!ok) {
      await releaseClaim(refund.id, 'Provider refund failed');
      logStructured(
        'refund.provider_failed',
        { refund: refund.reference, provider: refund.provider },
        'warn',
      );
      continue;
    }

    try {
      const completed = await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(payments)
          .where(eq(payments.id, refund.id))
          .limit(1)
          .for('update');
        if (!current || current.status !== 'pending') return false;

        const [reservation] = await tx
          .select()
          .from(reservations)
          .where(eq(reservations.id, current.reservationId))
          .limit(1)
          .for('update');
        if (!reservation) throw new Error('Reservation missing');

        await tx
          .update(payments)
          .set({
            status: 'paid',
            paidAt: new Date(),
            reconciled: true,
            reconciledAt: new Date(),
            refundClaimedAt: null,
            refundLastError: null,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, current.id));

        await tx
          .update(refunds)
          .set({ status: 'processed', processedAt: new Date() })
          .where(eq(refunds.paymentId, current.id));

        await recomputeReservationFinancials(
          tx,
          reservation.id,
          reservation.totalMinor,
        );

        await tx.insert(reservationStatusHistory).values({
          reservationId: reservation.id,
          fromStatus: reservation.status,
          toStatus: reservation.status,
          reason: `Provider refund processed: ${current.reference}`,
        });
        return true;
      });
      if (completed) processed += 1;
    } catch (error) {
      await releaseClaim(
        refund.id,
        error instanceof Error ? error.message : 'Refund finalisation failed',
      );
      logStructured(
        'refund.finalise_failed',
        {
          refund: refund.reference,
          error: error instanceof Error ? error.message : 'unknown',
        },
        'error',
      );
    }
  }

  if (processed > 0) logStructured('refund.processed', { count: processed });
  return processed;
}
