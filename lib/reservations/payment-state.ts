import type {
  AdminReservationStatus,
  PaymentState,
} from '@/types/reservation.types';

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

export function computeBalanceDue(
  totalMinor: number,
  amountPaidMinor: number,
  amountRefundedMinor: number,
  status: AdminReservationStatus,
): number {
  if (status === 'cancelled') return 0;
  return Math.max(0, totalMinor - amountPaidMinor + amountRefundedMinor);
}
