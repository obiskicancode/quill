import type { GuestReservation } from '../booking/types'
import { calendarUrl } from '../booking/client'
import type { PaymentInitResponse } from '../checkout/types'
import type { DetailsRequest } from './schemas'
import type {
  CancellationPreview, ChangeQuoteRequest, ChangeQuoteResponse, ManageApiError,
} from './types'

/** Typed fetch helpers for the manage page. Every change sends the CSRF token and an idempotency key, so retries are safe. */
export class ManageFailure extends Error {
  constructor(public status: number, public body: ManageApiError | null, public network = false) {
    super(body?.message ?? (network ? 'Network error' : 'Request failed'))
  }
  get sessionExpired() {
    return this.status === 401 && this.body?.code === 'session_expired'
  }
}

async function call<T>(url: string, init: RequestInit = {}, csrf?: string): Promise<T> {
  const headers = new Headers(init.headers)
  if (csrf) headers.set('X-CSRF-Token', csrf)
  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...init, headers })
  } catch {
    throw new ManageFailure(0, null, true)
  }
  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok) throw new ManageFailure(res.status, (json as ManageApiError | null) ?? null)
  return json as T
}

const enc = encodeURIComponent
const q = (url: string, demo: string | null) => (demo ? `${url}${url.includes('?') ? '&' : '?'}demo=${enc(demo)}` : url)
const json = (body: unknown): RequestInit => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const manageApi = {
  /** Reloads the booking with its manage data (allowed actions, timeline, CSRF token). */
  get: (ref: string, demo: string | null) => call<GuestReservation>(q(`/api/reservations/${enc(ref)}?manage=1`, demo)),
  cancellationPreview: (ref: string, demo: string | null) => call<CancellationPreview>(q(`/api/reservations/${enc(ref)}/cancellation-preview`, demo)),
  cancel: (ref: string, body: { idempotencyKey: string; reason: string | null; note: string | null; acknowledged: true; expectedRefundMinor: number }, csrf: string, demo: string | null) =>
    call<GuestReservation>(q(`/api/reservations/${enc(ref)}/cancel`, demo), { method: 'POST', ...json(body) }, csrf),
  changeQuote: (ref: string, body: ChangeQuoteRequest, csrf: string, demo: string | null) =>
    call<ChangeQuoteResponse>(q(`/api/reservations/${enc(ref)}/change-quote`, demo), { method: 'POST', ...json(body) }, csrf),
  changeDates: (ref: string, body: { idempotencyKey: string; quoteId: string }, csrf: string, demo: string | null) =>
    call<{ status: 'completed' | 'payment_required'; view: GuestReservation }>(q(`/api/reservations/${enc(ref)}/change-dates`, demo), { method: 'POST', ...json(body) }, csrf),
  saveDetails: (ref: string, body: DetailsRequest, csrf: string, demo: string | null) =>
    call<GuestReservation>(q(`/api/reservations/${enc(ref)}/details`, demo), { method: 'PATCH', ...json(body) }, csrf),
  signOut: (ref: string, csrf: string, demo: string | null) =>
    call<{ ok: true }>(q(`/api/reservations/${enc(ref)}/sign-out`, demo), { method: 'POST' }, csrf),
  /** Pays the difference for a date change. Reuses the checkout payment endpoint. */
  initChangePayment: (ref: string, body: { changeId: string; method: 'online' | 'bank_transfer'; idempotencyKey: string }, csrf: string, demo: string | null) =>
    call<PaymentInitResponse>('/api/payments/initialize', { method: 'POST', ...json({ reference: ref, purpose: 'change', demo, ...body }) }, csrf),
  uploadChangeProof: (ref: string, changeId: string, file: File, csrf: string, demo: string | null) => {
    const form = new FormData()
    form.set('file', file)
    return call<unknown>(q(`/api/reservations/${enc(ref)}/transfer-proof?change=${enc(changeId)}`, demo), { method: 'POST', body: form }, csrf)
  },
}

export { calendarUrl }
