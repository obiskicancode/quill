import type { GuestReservation, HeaderKind } from '@/types/booking.types';

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
