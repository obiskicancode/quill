import { fromISO, nightsBetween, toISO, type ISODate } from '../dates'
import type { Clock } from '../stay-quote'
import type { StoredReservation } from '../checkout/mock-db'
import type { PolicySummary } from '../checkout/types'
import type { PolicySnapshot } from '../booking/types'
import { calculateRefund } from './refund'
import type { ManageSettings } from './settings'
import type { ActionAllowance, AllowedActions, CancellationPreview } from './types'

/** Server-side rules for what a guest may do to a booking. Every mutation re-checks these. */

const CANCELLABLE = ['pending_payment', 'awaiting_transfer', 'awaiting_verification', 'pending_approval', 'reserved_pay_at_hotel', 'confirmed']
const CHANGEABLE = ['confirmed', 'pending_approval', 'reserved_pay_at_hotel']
const FINISHED = ['checked_out', 'cancelled', 'expired', 'no_show', 'payment_failed']
const EXTRAS_OK = ['confirmed', 'pending_approval', 'reserved_pay_at_hotel', 'checked_in']

const yes: ActionAllowance = { allowed: true }
const no = (reason: string): ActionAllowance => ({ allowed: false, reason })

/** Minutes from hotel-local "now" until check-in time. Negative once check-in has passed. */
export function minutesUntilCheckIn(clock: Clock, checkIn: ISODate, time24: string): number {
  const [h, m] = time24.split(':').map(Number)
  return nightsBetween(clock.today, checkIn) * 1440 + h * 60 + m - clock.minutes
}

/** The free-cancellation deadline for a stay, using the rule saved on the booking (hours before check-in). */
export function freeDeadline(
  policy: Pick<PolicySnapshot, 'cancellation' | 'freeCancellationHours'>, checkIn: ISODate, checkIn24: string, clock: Clock,
): PolicySummary {
  if (policy.cancellation.nonRefundable) return { nonRefundable: true, freeCancellationUntil: null, note: 'Non-refundable' }
  if (policy.freeCancellationHours !== null) {
    const [h, m] = checkIn24.split(':').map(Number)
    const d = fromISO(checkIn)
    d.setHours(h, m, 0, 0)
    d.setTime(d.getTime() - policy.freeCancellationHours * 3_600_000)
    const date = toISO(d)
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const passed = date < clock.today || (date === clock.today && d.getHours() * 60 + d.getMinutes() < clock.minutes)
    if (!passed) return { nonRefundable: false, freeCancellationUntil: { date, time }, note: 'Free cancellation' }
  }
  return { nonRefundable: false, freeCancellationUntil: null, note: 'Cancellation charges apply. See the Cancellation Policy.' }
}

export function allowedActions(r: StoredReservation, clock: Clock, s: ManageSettings): AllowedActions {
  const checkIn24 = r.snapshot.times.checkIn24
  const until = r.stay.checkIn ? minutesUntilCheckIn(clock, r.stay.checkIn, checkIn24) : -1

  const cancelReasons: Record<string, string> = {
    checked_in: "You've already checked in. Please speak to reception if you need to leave early.",
    checked_out: 'This stay is complete, so there is nothing to cancel.',
    cancelled: 'This booking is already cancelled.',
    expired: "This booking expired because it wasn't paid in time, so there is nothing to cancel.",
    no_show: 'This booking was marked as a no-show, so it can no longer be cancelled online.',
    payment_failed: "The payment didn't go through, so there is nothing to cancel.",
  }
  const canCancel = CANCELLABLE.includes(r.status) ? yes : no(cancelReasons[r.status] ?? 'This booking can no longer be cancelled online.')

  let canChangeDates: ActionAllowance
  if (r.pendingChange) canChangeDates = no('A date change is waiting for payment. Finish it or let it expire first.')
  else if (FINISHED.includes(r.status) || r.status === 'checked_in') canChangeDates = no("Dates can't be changed online for a booking in this status.")
  else if (!CHANGEABLE.includes(r.status)) canChangeDates = no("Dates can't be changed while a payment is waiting to be confirmed.")
  else if (until <= 0) canChangeDates = no('Check-in has already passed.')
  else if (until < s.minNoticeHours * 60) canChangeDates = no(`Dates can be changed online up to ${s.minNoticeHours} hours before check-in.`)
  else if (r.changeCount >= s.maxChanges) canChangeDates = no(`This booking has already been changed ${r.changeCount} ${r.changeCount === 1 ? 'time' : 'times'}, which is the most we allow online.`)
  else canChangeDates = yes

  const canEditDetails = FINISHED.includes(r.status) ? no("Details can't be edited for a booking in this status.") : yes
  const canAddExtras = !r.snapshot.addExtras.supported
    ? no('Adding extras after booking is not offered.')
    : EXTRAS_OK.includes(r.status) ? yes : no("Extras can't be added to a booking in this status.")

  return { canCancel, canChangeDates, canEditDetails, canAddExtras, changesRemaining: Math.max(0, s.maxChanges - r.changeCount) }
}

/** First night's share of the total, tax and charges included. */
export function firstNightMinor(r: StoredReservation): number {
  const b = r.snapshot.breakdown
  const first = b.lines[0]?.rateMinor ?? 0
  return b.roomSubtotalMinor > 0 ? Math.round((r.totals.totalMinor * first) / b.roomSubtotalMinor) : 0
}

/** What cancelling right now would do. Uses the policy snapshot saved on the booking. */
export function previewCancellation(r: StoredReservation, clock: Clock, s: ManageSettings): CancellationPreview {
  const result = calculateRefund({
    policy: r.snapshot.policy,
    mode: r.mode,
    method: r.method,
    paidMinor: r.paidMinor,
    totalMinor: r.totals.totalMinor,
    firstNightMinor: firstNightMinor(r),
    clock,
    timelines: { original: s.refundTimeline, manual: s.manualRefundTimeline },
  })
  return { ...result, paidMinor: r.paidMinor, totalMinor: r.totals.totalMinor, evaluatedAt: new Date().toISOString() }
}
