import { addDays, nightsBetween, todayISO } from '../dates'
import { logEvent, refresh, store, toStatus, type StoredReservation } from '../checkout/mock-db'
import { buildCheckoutQuote } from '../checkout/quote'
import { arrivalOptions } from '@/schemas/checkout.schema'
import { getCheckoutSettings, parseDemos } from '../checkout/settings'
import type { ReservationStatus, StatusResponse } from '@/types/checkout.types'
import { buildManageData } from '../manage/data'
import { previewCancellation } from '../manage/rules'
import { getManageSettings } from '../manage/settings'
import { config } from '@/config'
import { getRoomDetail } from '../room-detail'
import { hotelClock } from '../stay-quote'
import { maskEmail, maskPhone } from './mask'
import { buildSnapshot } from './snapshot'
import type { AccessLevel } from './session'
import type { GuestCancellation, GuestReservation, PaymentLabel } from '@/types/booking.types'

/** Turns a stored reservation into what the guest may see. Email and phone are masked until verification. */

function paymentLabel(r: StoredReservation): PaymentLabel {
  if (r.status === 'cancelled' && r.cancellation) {
    return r.cancellation.refundStatus === 'initiated' ? 'Refund started' : r.cancellation.refundStatus === 'pending_manual' ? 'Refund pending' : 'Cancelled'
  }
  const paidInFull = r.paidMinor >= r.totals.totalMinor && r.paidMinor > 0
  switch (r.status) {
    case 'confirmed': return r.mode === 'deposit' && !paidInFull ? 'Deposit paid' : 'Paid'
    case 'checked_in':
    case 'checked_out':
    case 'no_show': return paidInFull ? 'Paid' : r.paidMinor > 0 ? 'Deposit paid' : 'Pay at hotel'
    case 'pending_payment': return 'Awaiting confirmation'
    case 'awaiting_transfer':
    case 'awaiting_verification': return 'Awaiting verification'
    case 'pending_approval': return r.mode === 'pay_at_hotel' ? 'Pay at hotel' : r.paidMinor > 0 ? (r.mode === 'deposit' ? 'Deposit paid' : 'Paid') : 'Awaiting hotel approval'
    case 'reserved_pay_at_hotel': return 'Pay at hotel'
    default: return 'Not paid'
  }
}

export interface ViewOptions {
  /** Present for a manage-booking session. Contact details stay masked; the full values travel in `manage.contact`. */
  manage?: { csrf: string; expiresAt: number }
}

export function buildGuestReservation(r: StoredReservation, level: AccessLevel, opts: ViewOptions = {}): GuestReservation {
  const verified = level === 'verified'
  const showFull = verified && !opts.manage
  const snap = r.snapshot
  const methodLabel = r.method === 'online' ? `Card or USSD (${snap.providerName})` : r.method === 'bank_transfer' ? 'Bank transfer' : 'Pay at the hotel'
  const c = r.cancellation
  const cancellation: GuestCancellation | null = c
    ? {
        at: new Date(c.at).toISOString(),
        refundMinor: c.refund.refundMinor,
        retainedMinor: c.refund.retainedMinor,
        refundStatus: c.refundStatus,
        refundMethod: c.refund.refundMethod,
        timeline: c.refund.timeline,
      }
    : null

  return {
    reference: r.reference,
    status: r.status,
    paymentStatus: toStatus(r).paymentStatus,
    confirmationMode: r.confirmationMode,
    mode: r.mode,
    method: r.method,
    verified,
    stay: {
      checkIn: r.stay.checkIn || null,
      checkOut: r.stay.checkOut || null,
      nights: r.stay.checkIn && r.stay.checkOut ? nightsBetween(r.stay.checkIn, r.stay.checkOut) : 0,
      adults: r.stay.adults,
      children: r.stay.children,
    },
    room: snap.room,
    times: snap.times,
    breakdown: snap.breakdown,
    policy: snap.policy,
    hotel: snap.hotel,
    approvalResponse: snap.approvalResponse,
    addExtras: snap.addExtras,
    guest: {
      fullName: r.guest.fullName,
      email: showFull ? r.guest.email : maskEmail(r.guest.email),
      phone: showFull ? r.guest.phone : maskPhone(r.guest.phone),
      arrival: arrivalOptions.find((o) => o.value === r.guest.arrivalTime)?.label ?? '',
      specialRequests: r.guest.specialRequests,
    },
    amounts: {
      totalMinor: r.totals.totalMinor,
      paidMinor: r.paidMinor,
      dueNowMinor: r.totals.dueNowMinor,
      balanceMinor: r.status === 'cancelled' ? 0 : Math.max(0, r.totals.totalMinor - r.paidMinor),
    },
    payment: {
      label: paymentLabel(r),
      methodLabel,
      reference: r.paymentReference ?? (r.method === 'bank_transfer' ? r.reference : null),
      paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
    },
    bank: r.status === 'awaiting_transfer' ? { details: getCheckoutSettings(parseDemos(r.demo)).bank, amountMinor: r.totals.dueNowMinor } : null,
    proofUploaded: r.proof !== null,
    holdExpiresAt: new Date(r.holdExpiresAt).toISOString(),
    serverTime: new Date().toISOString(),
    cancellation,
    ...(opts.manage ? { manage: buildManageData(r, opts.manage, hotelClock()) } : {}),
  }
}

// ---------------------------------------------------------------------------------------------
// DEV-ONLY preview data. `ref=DEMO-01&demo=<switches>` builds a reservation in any state, with no checkout needed.
// Switches combine with commas, e.g. demo=confirmed,soon,deposit. The built reservation is kept in memory so changes
// and cancellations made on it persist until the server restarts (add `reset` to rebuild it).
// ---------------------------------------------------------------------------------------------

export const isDemoRef = (reference: string) => config.isDev && reference === 'DEMO-01'

const pollStart: { at: number } = ((globalThis as unknown as { __deaPollDemo?: { at: number } }).__deaPollDemo ??= { at: 0 })

export async function demoStored(demo: string | null): Promise<StoredReservation> {
  const tokens = new Set((demo ?? '').split(',').map((t) => t.trim()).filter(Boolean))
  const has = (t: string) => tokens.has(t)
  const soon = has('soon') || has('partial')
  const mode = has('deposit') ? 'deposit' : has('athotel') ? 'pay_at_hotel' : 'full'
  const switches = [
    mode === 'deposit' ? 'deposit' : '', mode === 'pay_at_hotel' ? 'athotel' : '', has('approval') ? 'manual' : '',
    has('nonrefundable') ? 'nonrefundable' : '', 'fees', 'avail',
  ].filter(Boolean).join(',')

  const room = getRoomDetail('deluxe-room')!
  // `peak` books the peak-season dates (26 to 29 Dec), so moving to cheaper dates shows a refund.
  const nextPeak = () => {
    const y = Number(todayISO().slice(0, 4))
    const dec = `${y}-12-26`
    return dec > addDays(todayISO(), 5) ? dec : `${y + 1}-12-26`
  }
  const baseIn = has('peak') ? nextPeak() : addDays(todayISO(), soon ? 1 : 14)
  const quote = await buildCheckoutQuote({
    room: room.slug, checkIn: baseIn, checkOut: addDays(baseIn, 3), adults: 2, children: 1, extraBed: true,
    extras: [{ id: 'airport-pickup', quantity: 1 }, { id: 'breakfast', quantity: 1 }], demo: switches,
  })
  if (quote.status !== 'ok') throw new Error('Demo quote unavailable')

  const settings = getCheckoutSettings(parseDemos(switches))
  const snapshot = buildSnapshot(room, quote, settings)
  if (has('addextras')) snapshot.addExtras.supported = true
  if (has('pct')) snapshot.policy.afterDeadline = { kind: 'percent', percent: 50 }

  let status: ReservationStatus = 'confirmed'
  let method: StoredReservation['method'] = mode === 'pay_at_hotel' ? null : has('banktransfer') ? 'bank_transfer' : 'online'
  if (has('confirming') || has('poll-timeout')) status = 'pending_payment'
  if (has('poll-update')) {
    if (!pollStart.at || Date.now() - pollStart.at > 60_000) pollStart.at = Date.now()
    status = Date.now() - pollStart.at > 6000 ? 'confirmed' : 'pending_payment'
  }
  if (has('transfer')) { status = 'awaiting_transfer'; method = 'bank_transfer' }
  if (has('transfer-sent')) { status = 'awaiting_verification'; method = 'bank_transfer' }
  if (has('approval')) status = 'pending_approval'
  if (has('athotel')) status = 'reserved_pay_at_hotel'
  if (has('expired')) status = 'expired'
  if (has('failed')) status = 'payment_failed'
  if (has('checkedin')) status = 'checked_in'
  if (has('checkedout')) status = 'checked_out'
  if (has('noshow')) status = 'no_show'

  const paid = ['confirmed', 'checked_in', 'checked_out', 'no_show'].includes(status) && mode !== 'pay_at_hotel' || (status === 'pending_approval' && has('approval'))
  const now = Date.now()
  const dIn = status === 'checked_in' ? addDays(todayISO(), -1) : status === 'checked_out' ? addDays(todayISO(), -5) : status === 'no_show' ? addDays(todayISO(), -2) : baseIn
  const r: StoredReservation = {
    reference: 'DEMO-01',
    roomSlug: room.slug,
    stay: { checkIn: has('nodate') ? '' : dIn, checkOut: has('nodate') ? '' : addDays(dIn, 3), adults: 2, children: 1, extraBed: true },
    extras: [{ id: 'airport-pickup', quantity: 1 }, { id: 'breakfast', quantity: 1 }],
    totals: { totalMinor: quote.payment.totalMinor, dueNowMinor: quote.payment.dueNowMinor, balanceAtHotelMinor: quote.payment.balanceAtHotelMinor },
    mode,
    confirmationMode: has('approval') ? 'manual' : 'instant',
    method,
    status,
    holdExpiresAt: now + 10 * 60_000,
    termsAcceptedAt: new Date(now).toISOString(),
    createdAt: now - 3 * 3_600_000,
    demo: switches,
    payment: null,
    proof: status === 'awaiting_verification' ? { type: 'application/pdf', size: 1000 } : null,
    guest: { fullName: 'Ada Obi', email: 'ada.obi@example.com', phone: '+2348012345678', country: 'NG', arrivalTime: '14-16', specialRequests: 'A quiet room, please, and a late check-in call.' },
    snapshot,
    paidMinor: paid ? quote.payment.dueNowMinor : 0,
    paymentReference: paid ? 'PAY-482913005' : null,
    paidAt: paid ? now - 2 * 3_600_000 : null,
    history: [],
    changeCount: has('changelimit') ? 2 : 0,
    cancellation: null,
    refunds: [],
    pendingChange: null,
  }

  // Timeline for the preview.
  logEvent(r, 'created')
  r.history[0].at = r.createdAt
  r.history.push({ id: 'h_mail1', at: r.createdAt + 5_000, type: 'email_sent', detail: 'Booking details emailed to you.' })
  if (paid) r.history.push({ id: 'h_pay', at: r.paidAt as number, type: 'payment_received' })
  if (r.changeCount > 0) r.history.push({ id: 'h_chg', at: now - 3_600_000, type: 'dates_changed', detail: 'Earlier change of dates' })
  if (status === 'checked_in') r.history.push({ id: 'h_ci', at: now - 3_600_000, type: 'checked_in' })
  if (status === 'checked_out') r.history.push({ id: 'h_co', at: now - 3_600_000, type: 'checked_out' })
  if (status === 'no_show') r.history.push({ id: 'h_ns', at: now - 3_600_000, type: 'no_show' })

  if (has('cancelled')) {
    const prev = previewCancellation(r, hotelClock(), getManageSettings(parseDemos(switches)))
    const refundStatus = prev.refundMinor > 0 ? (prev.refundMethod === 'manual_bank' ? 'pending_manual' : 'initiated') : 'none'
    r.status = 'cancelled'
    r.cancellation = { at: now - 600_000, reason: 'Change of plans', note: null, refund: prev, refundStatus }
    r.history.push({ id: 'h_can', at: now - 600_000, type: 'cancelled' })
    if (prev.refundMinor > 0) r.history.push({ id: 'h_ref', at: now - 599_000, type: refundStatus === 'pending_manual' ? 'refund_pending_manual' : 'refund_initiated' })
  }
  return r
}

/** The one place the pages and APIs look up a reservation (real or demo). */
export async function loadReservation(reference: string, demo: string | null): Promise<StoredReservation | null> {
  if (isDemoRef(reference)) {
    const tokens = (demo ?? '').split(',').map((t) => t.trim()).filter(Boolean)
    const key = tokens.filter((t) => t !== 'reset').sort().join(',')
    if (tokens.includes('reset')) store.demoReservations.delete(key)
    if (tokens.includes('poll-update')) return demoStored(demo)
    let cached = store.demoReservations.get(key)
    if (!cached) {
      cached = await demoStored(key)
      store.demoReservations.set(key, cached)
    }
    return refresh(cached)
  }
  const r = store.reservations.get(reference)
  return r ? refresh(r) : null
}

export const statusOf = (r: StoredReservation): StatusResponse => toStatus(r)
