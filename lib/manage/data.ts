import type { Clock } from '@/types/dates.types';
import type {
  HistoryEntry,
  HistoryType,
  ManageData,
  PendingChangeView,
  TimelineEntry,
} from '@/types/manage.types';

import type { StoredReservation } from '../booking/store';
import { getCheckoutSettings } from '../checkout/settings';
import { allowedActions, previewCancellation } from './rules';
import { getManageSettings } from './settings';

const timelineLabels: Record<HistoryType, string> = {
  created: 'Booking created',
  payment_received: 'Payment received',
  payment_verified: 'Payment verified by the hotel',
  transfer_proof_received: 'Transfer receipt received',
  approved: 'Hotel approved your booking',
  details_changed: 'You updated your details',
  dates_changed: 'Dates changed',
  change_requested: 'Date change started, waiting for payment',
  change_expired: 'Date change expired',
  email_sent: 'Email sent to you',
  cancelled: 'Booking cancelled',
  refund_initiated: 'Refund started',
  refund_pending_manual: 'Refund passed to the hotel',
  expired: 'Booking expired',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  no_show: 'Marked as a no-show',
};

export function timelineFrom(history: HistoryEntry[]): TimelineEntry[] {
  return [...history]
    .sort((a, b) => b.at - a.at)
    .map((h) => ({
      id: h.id,
      at: new Date(h.at).toISOString(),
      label: timelineLabels[h.type],
      detail: h.detail,
    }));
}

export async function buildManageData(
  r: StoredReservation,
  session: { csrf: string; expiresAt: number },
  clock: Clock,
): Promise<ManageData> {
  const settings = await getManageSettings();
  const allowed = allowedActions(r, clock, settings);
  const pc = r.pendingChange;
  const checkout = await getCheckoutSettings();
  const pendingChange: PendingChangeView | null = pc
    ? {
        changeId: pc.changeId,
        checkIn: pc.checkIn,
        checkOut: pc.checkOut,
        amountDueMinor: pc.amountDueMinor,
        holdExpiresAt: new Date(pc.holdExpiresAt).toISOString(),
        status: pc.status,
        method: pc.method,
        bank:
          pc.status === 'awaiting_transfer'
            ? { details: checkout.bank, amountMinor: pc.amountDueMinor }
            : null,
        acceptedMethods: checkout.acceptedMethods,
        providerName: r.snapshot.providerName,
      }
    : null;

  return {
    csrfToken: session.csrf,
    sessionExpiresAt: new Date(session.expiresAt).toISOString(),
    allowed,
    timeline: timelineFrom(r.history),
    cancellation: allowed.canCancel.allowed
      ? previewCancellation(r, clock, settings)
      : null,
    pendingChange,
    contact: { email: r.guest.email, phone: r.guest.phone },
    editable: {
      fullName: r.guest.fullName,
      phone: r.guest.phone,
      country: r.guest.country,
      arrivalTime: r.guest.arrivalTime,
      specialRequests: r.guest.specialRequests,
    },
  };
}
