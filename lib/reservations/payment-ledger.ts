/**
 * Reservation financial recomputation and refund-payment creation. These run
 * inside the caller's transaction so ledger rows and reservation totals move
 * together.
 */

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { payments, refunds, reservations } from '@/db/schema';
import { createReference } from '@/lib/db/reference';

import { balanceFromLedger, ledgerFromPayments } from './ledger';

/** A database handle or transaction that can read and write ledger rows. */
export type LedgerExecutor = Pick<
  typeof db,
  'select' | 'insert' | 'update' | 'delete'
>;

export { balanceFromLedger, ledgerFromPayments } from './ledger';
export type { LedgerEntry } from './ledger';

/** Derived financial totals for a reservation. */
export interface ReservationLedger {
  paidMinor: number;
  refundedMinor: number;
  pendingRefundMinor: number;
  balanceMinor: number;
}

/**
 * Recalculates paid, refunded, pending-refund and balance totals from payment
 * rows and persists them on the reservation.
 */
export async function recomputeReservationFinancials(
  executor: LedgerExecutor,
  reservationId: string,
  totalMinorOverride?: number,
): Promise<(ReservationLedger & { totalMinor: number }) | null> {
  const [reservation] = await executor
    .select({ totalMinor: reservations.totalMinor })
    .from(reservations)
    .where(eq(reservations.id, reservationId))
    .limit(1);
  if (!reservation) return null;

  const rows = await executor
    .select({
      type: payments.type,
      status: payments.status,
      amountMinor: payments.amountMinor,
    })
    .from(payments)
    .where(eq(payments.reservationId, reservationId));

  const totalMinor = totalMinorOverride ?? reservation.totalMinor;
  const { paidMinor, refundedMinor, pendingRefundMinor } =
    ledgerFromPayments(rows);
  const balanceMinor = balanceFromLedger(totalMinor, paidMinor, refundedMinor);

  await executor
    .update(reservations)
    .set({
      amountPaidMinor: paidMinor,
      amountRefundedMinor: refundedMinor,
      balanceMinor,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, reservationId));

  return {
    paidMinor,
    refundedMinor,
    pendingRefundMinor,
    balanceMinor,
    totalMinor,
  };
}

/**
 * Creates the refund payment and matching refund record, linking them to the
 * original payment when a reference or id is supplied.
 */
export async function insertRefundPayment(
  executor: LedgerExecutor,
  input: {
    reservationId: string;
    amountMinor: number;
    method: string;
    provider: 'paystack' | 'flutterwave' | 'stripe' | 'bank_transfer' | 'cash';
    status: 'pending' | 'paid';
    reason: string;
    originalPaymentReference?: string | null;
    originalPaymentId?: string | null;
    reference?: string;
    settled?: boolean;
  },
): Promise<{ paymentId: string; refundId: string }> {
  let originalPaymentId = input.originalPaymentId ?? null;
  if (!originalPaymentId && input.originalPaymentReference) {
    const [original] = await executor
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.reference, input.originalPaymentReference))
      .limit(1);
    originalPaymentId = original?.id ?? null;
  }

  const paymentId = randomUUID();
  await executor.insert(payments).values({
    id: paymentId,
    reservationId: input.reservationId,
    refundOfPaymentId: originalPaymentId,
    reference: input.reference ?? createReference(),
    provider: input.provider,
    type: 'refund',
    status: input.status,
    amountMinor: input.amountMinor,
    currency: 'NGN',
    channel: input.method,
    note: input.reason,
    reconciled: input.status === 'paid',
    reconciledAt: input.status === 'paid' ? new Date() : null,
    paidAt: input.status === 'paid' ? new Date() : null,
  });

  const refundId = randomUUID();
  await executor.insert(refunds).values({
    id: refundId,
    reservationId: input.reservationId,
    paymentId,
    amountMinor: input.amountMinor,
    method: input.method,
    status: input.status === 'paid' ? 'processed' : 'pending_manual',
    reason: input.reason,
    processedAt: input.status === 'paid' ? new Date() : null,
  });

  return { paymentId, refundId };
}
