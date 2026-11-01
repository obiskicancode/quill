import type { GuestReservation, HeaderKind } from '@/types/booking.types';
import type { GuestReservationStatus } from '@/types/checkout.types';

/** Everything except `pending_payment`: the booking is no longer waiting on a payment to clear. */
export const TERMINAL_STATUSES: ReadonlySet<GuestReservationStatus> = new Set([
  'awaiting_transfer',
  'awaiting_verification',
  'pending_approval',
  'reserved_pay_at_hotel',
  'confirmed',
  'payment_failed',
  'cancelled',
  'expired',
  'checked_in',
  'checked_out',
  'no_show',
]);

export function headerKind(
  reservation: Pick<GuestReservation, 'status' | 'mode'>,
): HeaderKind {
  switch (reservation.status) {
    case 'confirmed':
    case 'checked_in':
      return reservation.mode === 'deposit' ? 'confirmed-deposit' : 'confirmed';
    case 'pending_payment':
      return 'confirming';
    case 'awaiting_transfer':
    case 'awaiting_verification':
      return 'transfer';
    case 'pending_approval':
      return 'approval';
    case 'reserved_pay_at_hotel':
      return 'pay-at-hotel';
    default:
      return 'ended';
  }
}
