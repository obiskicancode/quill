/**
 * Presentation helpers for guest booking status. The database status is mapped
 * to the header treatment the confirmation and manage pages share.
 */
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

/** Maps a reservation status and payment mode to the header style to render. */
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

/**
 * A booking that is paid, confirmed and still in the future. Only this one state
 * puts its calendar action in the header, so the action row below can skip it
 * rather than offering the same button twice.
 */
export function headerOwnsCalendar(
  kind: HeaderKind,
  status: GuestReservationStatus,
): boolean {
  return (
    status === 'confirmed' &&
    (kind === 'confirmed' || kind === 'confirmed-deposit')
  );
}
