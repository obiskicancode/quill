import type { GuestInfo, ReservationSnapshot } from '../booking/types'
import { formatRange } from '../room-query'
import type { CheckoutBreakdown, PolicySummary } from './types'
import type {
  HistoryEntry, HistoryType, PendingChange, RefundRecord, StoredCancellation,
} from '../manage/types'
import type {
  ConfirmationMode, ExtraSelection, PaymentInitResponse, PaymentStatus, PaymentMethod, ReservationResponse, ReservationStatus, StatusResponse,
} from './types'

/**
 * MOCK PERSISTENCE (in memory, survives hot reloads via globalThis). Replace with your database.
 * It stores no more guest data than the demo needs and never logs any of it.
 */

export interface StoredReservation {
  reference: string
  roomSlug: string
  stay: { checkIn: string; checkOut: string; adults: number; children: number; extraBed: boolean }
  extras: ExtraSelection[]
  totals: { totalMinor: number; dueNowMinor: number; balanceAtHotelMinor: number }
  mode: 'full' | 'deposit' | 'pay_at_hotel'
  confirmationMode: ConfirmationMode
  method: PaymentMethod | null
  status: ReservationStatus
  holdExpiresAt: number
  termsAcceptedAt: string
  createdAt: number
  demo: string | null
  payment: { webhookAt: number; outcome: 'paid' | 'failed' | 'cancelled' } | null
  proof: { type: string; size: number } | null
  /** Guest-visible data kept for the confirmation and manage pages. */
  guest: GuestInfo
  /** Copied at creation. The pages show this, never the current hotel settings. */
  snapshot: ReservationSnapshot
  paidMinor: number
  paymentReference: string | null
  paidAt: number | null
  /** Every event, for the activity timeline and the audit trail. */
  history: HistoryEntry[]
  changeCount: number
  cancellation: StoredCancellation | null
  refunds: RefundRecord[]
  pendingChange: PendingChange | null
}

export interface StoredQuote {
  id: string
  reference: string
  checkIn: string
  checkOut: string
  breakdown: CheckoutBreakdown
  oldTotalMinor: number
  newTotalMinor: number
  settle: 'now' | 'at_hotel'
  roomReassigned: boolean
  policy: PolicySummary
  expiresAt: number
}

export interface AuditEntry {
  at: number
  reference: string
  action: HistoryType | 'sign_out'
  actor: 'guest' | 'system'
}

export interface OutboxEntry {
  at: number
  reference: string
  to: 'guest' | 'hotel'
  kind: string
}

interface Store {
  reservations: Map<string, StoredReservation>
  idempotency: Map<string, string>
  paymentResponses: Map<string, PaymentInitResponse>
  rate: Map<string, number[]>
  failedOnce: Set<string>
  quotes: Map<string, StoredQuote>
  results: Map<string, unknown>
  audit: AuditEntry[]
  outbox: OutboxEntry[]
  consumed: Set<string>
  demoReservations: Map<string, StoredReservation>
}

const g = globalThis as unknown as { __deaCheckout?: Store }
export const store: Store = (g.__deaCheckout ??= {
  reservations: new Map(), idempotency: new Map(), paymentResponses: new Map(), rate: new Map(), failedOnce: new Set(),
  quotes: new Map(), results: new Map(), audit: [], outbox: [], consumed: new Set(), demoReservations: new Map(),
})

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function createReference(): string {
  let ref = 'DEA-'
  for (let i = 0; i < 6; i++) ref += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return ref
}

export const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`

/** Allows `limit` attempts per window per key. */
export function rateLimited(clientId: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const hits = (store.rate.get(clientId) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    store.rate.set(clientId, hits)
    return true
  }
  store.rate.set(clientId, [...hits, now])
  return false
}

/** Writes to the reservation's status history and the audit log. Details are plain text with no personal data. */
export function logEvent(r: StoredReservation, type: HistoryType, detail?: string, actor: 'guest' | 'system' = 'system'): void {
  const at = Date.now()
  r.history.push({ id: newId('h'), at, type, detail })
  store.audit.push({ at, reference: r.reference, action: type, actor })
}

/** Records the emails a change or cancellation triggers: one to the guest and an alert to the hotel's recipients. */
export function notify(r: StoredReservation, kind: string, guestDetail: string): void {
  const at = Date.now()
  store.outbox.push({ at, reference: r.reference, to: 'guest', kind }, { at, reference: r.reference, to: 'hotel', kind })
  logEvent(r, 'email_sent', guestDetail)
}

export function applyStayChange(
  r: StoredReservation,
  c: { checkIn: string; checkOut: string; breakdown: CheckoutBreakdown; totalMinor: number; paidDeltaMinor: number; policy: PolicySummary },
): void {
  const before = r.stay.checkIn && r.stay.checkOut ? formatRange(r.stay.checkIn, r.stay.checkOut) : 'earlier dates'
  r.stay.checkIn = c.checkIn
  r.stay.checkOut = c.checkOut
  r.snapshot.breakdown = c.breakdown
  r.snapshot.policy.cancellation = c.policy
  r.paidMinor = Math.max(0, r.paidMinor + c.paidDeltaMinor)
  r.totals = {
    totalMinor: c.totalMinor,
    dueNowMinor: r.mode === 'full' ? c.totalMinor : r.mode === 'deposit' ? r.totals.dueNowMinor : 0,
    balanceAtHotelMinor: Math.max(0, c.totalMinor - r.paidMinor),
  }
  r.changeCount += 1
  logEvent(r, 'dates_changed', `From ${before} to ${formatRange(c.checkIn, c.checkOut)}`, 'guest')
}

const paymentStates = new Map<string, 'paid' | 'failed' | 'cancelled'>()

/** Applies anything that should have happened by now: the provider webhook, a held change expiring, or the hold running out. */
export function refresh(r: StoredReservation): StoredReservation {
  const now = Date.now()
  if (r.payment && now >= r.payment.webhookAt && r.status === 'pending_payment') {
    const { outcome } = r.payment
    r.status = outcome === 'paid' ? (r.confirmationMode === 'instant' ? 'confirmed' : 'pending_approval') : outcome === 'failed' ? 'payment_failed' : 'cancelled'
    r.payment = null
    paymentStates.set(r.reference, outcome)
    if (outcome === 'paid') {
      r.paidMinor = r.totals.dueNowMinor
      r.paymentReference = `PAY-${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`
      r.paidAt = now
      logEvent(r, 'payment_received')
    }
  }

  const pc = r.pendingChange
  if (pc) {
    if (pc.payment && now >= pc.payment.webhookAt && pc.status === 'awaiting_payment') {
      if (pc.payment.outcome === 'paid') {
        applyStayChange(r, { checkIn: pc.checkIn, checkOut: pc.checkOut, breakdown: pc.breakdown, totalMinor: pc.totalMinor, paidDeltaMinor: pc.amountDueMinor, policy: pc.policy })
        logEvent(r, 'payment_received', 'Payment for your new dates')
        notify(r, 'dates_changed', 'Your updated booking was emailed to you.')
        r.pendingChange = null
      } else {
        pc.status = 'payment_failed'
        pc.payment = null
      }
    } else if (now > pc.holdExpiresAt && pc.status !== 'awaiting_verification') {
      r.pendingChange = null
      logEvent(r, 'change_expired', 'Your current dates stayed as they were.')
    }
  }

  if (now > r.holdExpiresAt && ['pending_payment', 'awaiting_transfer', 'payment_failed'].includes(r.status)) {
    r.status = 'expired'
    logEvent(r, 'expired')
  }
  return r
}

export function paymentStatusOf(r: StoredReservation): PaymentStatus {
  if (r.payment) return 'pending'
  const settled = paymentStates.get(r.reference)
  if (settled && ['confirmed', 'pending_approval', 'payment_failed', 'cancelled'].includes(r.status)) return settled
  return r.paidMinor > 0 ? 'paid' : 'none'
}

export function toReservationResponse(r: StoredReservation): ReservationResponse {
  return {
    reference: r.reference,
    status: r.status,
    holdExpiresAt: new Date(r.holdExpiresAt).toISOString(),
    serverTime: new Date().toISOString(),
    confirmationMode: r.confirmationMode,
    amounts: r.totals,
  }
}

export function toStatus(r: StoredReservation): StatusResponse {
  return {
    reference: r.reference,
    status: r.status,
    paymentStatus: paymentStatusOf(r),
    holdExpiresAt: new Date(r.holdExpiresAt).toISOString(),
    serverTime: new Date().toISOString(),
    confirmationMode: r.confirmationMode,
  }
}
