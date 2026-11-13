/**
 * Pure payment-state helpers shared by the admin reservation views.
 */

import type {
  AdminReservationStatus,
  PaymentState,
} from '@/types/reservation.types';

/** Classifies a reservation from its total, paid and refunded amounts. */
export function computePaymentState(
  totalMinor: number,
  amountPaidMinor: number,
  amountRefundedMinor: number,
): PaymentState {
  if (amountRefundedMinor > 0) return 'refunded';
  if (amountPaidMinor >= totalMinor && totalMinor > 0) return 'fully_paid';
  if (amountPaidMinor > 0) return 'deposit_paid';
  return 'unpaid';
}

/** Remaining balance due; cancelled reservations always owe zero. */
export function computeBalanceDue(
  totalMinor: number,
  amountPaidMinor: number,
  amountRefundedMinor: number,
  status: AdminReservationStatus,
): number {
  if (status === 'cancelled') return 0;
  return Math.max(0, totalMinor - amountPaidMinor + amountRefundedMinor);
}
