import type { HistoryEntry, HistoryType, TimelineEntry } from '@/types/manage.types'

/** Plain-language labels for the activity timeline. Newest first. */
const labels: Record<HistoryType, string> = {
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
}

export function timelineFrom(history: HistoryEntry[]): TimelineEntry[] {
  return [...history]
    .sort((a, b) => b.at - a.at)
    .map((h) => ({ id: h.id, at: new Date(h.at).toISOString(), label: labels[h.type], detail: h.detail }))
}
