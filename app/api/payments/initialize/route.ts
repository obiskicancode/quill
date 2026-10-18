import { loadReservation } from '@/lib/booking/view'
import { requireManage } from '@/lib/manage/auth'
import { refresh, store, type StoredReservation } from '@/lib/checkout/mock-db'
import { apiFail, apiOk } from '@/app/api/envelope'
import { fieldErrorsFrom, paymentInitSchema } from '@/schemas/checkout.schema'
import { getCheckoutSettings, parseDemos } from '@/lib/checkout/settings'
import type { ApiError, PaymentInitResponse } from '@/types/checkout.types'

const fail = (status: number, error: ApiError) => apiFail(status, error.message, error)

function returnUrl(r: StoredReservation, demo: string | null): string {
  const p = new URLSearchParams({
    room: r.roomSlug, checkIn: r.stay.checkIn, checkOut: r.stay.checkOut,
    adults: String(r.stay.adults), children: String(r.stay.children), ref: r.reference, return: '1',
  })
  if (demo) p.set('demo', demo)
  return `/checkout?${p.toString()}`
}

/**
 * Returns the provider's hosted checkout URL, or the hotel's bank details.
 * MOCK: the "provider" is simulated; a real integration returns the provider's URL and confirms only via its signed webhook.
 */
export async function POST(req: Request) {
  const parsed = paymentInitSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail(422, { code: 'validation', message: 'Invalid payment request.', fieldErrors: fieldErrorsFrom(parsed.error) })
  const { reference, method, idempotencyKey, demo, purpose, changeId } = parsed.data

  const replay = store.paymentResponses.get(idempotencyKey)
  if (replay) return apiOk(replay)

  // Paying the difference for a date change reuses this endpoint. The old dates stay valid until the payment lands.
  if (purpose === 'change') {
    const auth = await requireManage(req, reference, demo ?? null)
    if (!auth.ok) return auth.res
    const r = await loadReservation(reference, demo ?? null)
    const pc = r ? refresh(r).pendingChange : null
    if (!r || !pc || pc.changeId !== changeId) return fail(409, { code: 'validation', message: 'There is no date change waiting for payment.' })
    if (pc.status === 'awaiting_verification') return fail(409, { code: 'validation', message: 'This change is already waiting for verification.' })
    const demos = parseDemos(demo ?? r.demo)
    pc.method = method
    let changeResponse: PaymentInitResponse
    if (method === 'bank_transfer') {
      pc.status = 'awaiting_transfer'
      pc.payment = null
      changeResponse = { kind: 'bank_transfer', bank: getCheckoutSettings(demos).bank, amountMinor: pc.amountDueMinor, reference }
    } else {
      const outcome = demos.has('payfail') ? 'failed' : demos.has('paycancel') ? 'cancelled' : 'paid'
      pc.status = 'awaiting_payment'
      pc.payment = { webhookAt: Date.now() + (demos.has('slowwebhook') ? 3_600_000 : outcome === 'paid' ? 3500 : 1500), outcome }
      const p = new URLSearchParams({ ref: reference, return: 'change' })
      if (demo) p.set('demo', demo)
      changeResponse = { kind: 'redirect', url: `/booking/manage?${p.toString()}` }
    }
    store.paymentResponses.set(idempotencyKey, changeResponse)
    return apiOk(changeResponse)
  }

  const reservation = store.reservations.get(reference)
  if (!reservation) return fail(404, { code: 'not_found', message: 'Reservation not found.' })
  refresh(reservation)
  if (reservation.status === 'expired') return fail(410, { code: 'hold_expired', message: 'The hold on this room has ended.' })
  if (reservation.mode === 'pay_at_hotel') return fail(400, { code: 'validation', message: 'Nothing to pay online for this reservation.' })
  if (!['pending_payment', 'awaiting_transfer', 'payment_failed', 'cancelled'].includes(reservation.status)) {
    return fail(409, { code: 'validation', message: 'This reservation is already being processed.' })
  }

  const demos = parseDemos(demo ?? reservation.demo)
  reservation.method = method
  let response: PaymentInitResponse

  if (method === 'bank_transfer') {
    reservation.status = 'awaiting_transfer'
    reservation.payment = null
    response = { kind: 'bank_transfer', bank: getCheckoutSettings(demos).bank, amountMinor: reservation.totals.dueNowMinor, reference }
  } else {
    const outcome = demos.has('payfail') ? 'failed' : demos.has('paycancel') ? 'cancelled' : 'paid'
    // slowwebhook: the provider call "succeeds" but the signed webhook does not arrive for a long time.
    const delay = demos.has('slowwebhook') ? 3_600_000 : outcome === 'paid' ? 3500 : 1500
    reservation.status = 'pending_payment'
    reservation.payment = { webhookAt: Date.now() + delay, outcome }
    response = { kind: 'redirect', url: returnUrl(reservation, demo ?? reservation.demo) }
  }
  store.paymentResponses.set(idempotencyKey, response)
  return apiOk(response)
}
