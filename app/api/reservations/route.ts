import { NextResponse } from 'next/server'
import { buildSnapshot } from '@/lib/booking/snapshot'
import { setAccessCookie } from '@/lib/booking/session'
import { getRoomDetail } from '@/lib/room-detail'
import { buildCheckoutQuote } from '@/lib/checkout/quote'
import { createReference, logEvent, notify, rateLimited, refresh, store, toReservationResponse, type StoredReservation } from '@/lib/checkout/mock-db'
import { fieldErrorsFrom, reservationRequestSchema } from '@/schemas/checkout.schema'
import { getCheckoutSettings, parseDemos } from '@/lib/checkout/settings'
import type { ApiError } from '@/types/checkout.types'

const fail = (status: number, error: ApiError, headers?: Record<string, string>) => NextResponse.json(error, { status, headers })

/**
 * Creates the pending reservation and starts the hold. Safe to retry: the same idempotency key always returns
 * the same reservation, so a dropped connection can never create two.
 */
export async function POST(req: Request) {
  const client = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (rateLimited(client)) {
    return fail(429, { code: 'rate_limited', message: 'Too many attempts. Please wait a minute and try again.' }, { 'Retry-After': '60' })
  }

  const body = await req.json().catch(() => null)
  const parsed = reservationRequestSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, { code: 'validation', message: 'Some details need fixing.', fieldErrors: fieldErrorsFrom(parsed.error) })
  }
  const data = parsed.data
  if (data.website) return fail(400, { code: 'rejected', message: 'We could not process this request.' })

  // Idempotent replay.
  const existingRef = store.idempotency.get(`res:${data.idempotencyKey}`)
  const existing = existingRef ? store.reservations.get(existingRef) : undefined
  if (existing) {
    const replay = NextResponse.json(toReservationResponse(refresh(existing)))
    setAccessCookie(replay, existing.reference, 'checkout')
    return replay
  }

  // Never trust the client: re-quote on the server.
  const quote = await buildCheckoutQuote({
    room: data.room, checkIn: data.checkIn, checkOut: data.checkOut, adults: data.adults, children: data.children,
    extraBed: data.extraBed, extras: data.extras, demo: data.demo,
  })
  if (quote.status === 'unavailable') return fail(409, { code: 'unavailable', message: 'That room is no longer available for these dates.', quote })
  if (quote.status === 'invalid') return fail(409, { code: 'validation', message: quote.message })
  if (quote.breakdown.totalMinor !== data.expectedTotalMinor) {
    return fail(409, { code: 'price_changed', message: 'The price has changed.', quote })
  }

  const demos = parseDemos(data.demo)
  const settings = getCheckoutSettings(demos)
  const now = Date.now()
  const noPayment = settings.paymentMode === 'pay_at_hotel'
  const reservation: StoredReservation = {
    reference: createReference(),
    roomSlug: data.room,
    stay: { checkIn: data.checkIn, checkOut: data.checkOut, adults: data.adults, children: data.children, extraBed: data.extraBed },
    extras: data.extras,
    totals: { totalMinor: quote.payment.totalMinor, dueNowMinor: quote.payment.dueNowMinor, balanceAtHotelMinor: quote.payment.balanceAtHotelMinor },
    mode: settings.paymentMode,
    confirmationMode: settings.confirmationMode,
    method: null,
    status: noPayment ? (settings.confirmationMode === 'instant' ? 'reserved_pay_at_hotel' : 'pending_approval') : 'pending_payment',
    holdExpiresAt: now + quote.holdSeconds * 1000,
    termsAcceptedAt: new Date(now).toISOString(),
    createdAt: now,
    demo: data.demo ?? null,
    payment: null,
    proof: null,
    // Kept only for the confirmation page. Never logged.
    guest: {
      fullName: data.guest.fullName, email: data.guest.email, phone: data.guest.phone, country: data.guest.country,
      arrivalTime: data.guest.arrivalTime, specialRequests: data.guest.specialRequests,
    },
    snapshot: buildSnapshot(getRoomDetail(data.room)!, quote, settings),
    paidMinor: 0,
    paymentReference: null,
    paidAt: null,
    history: [],
    changeCount: 0,
    cancellation: null,
    refunds: [],
    pendingChange: null,
  }
  logEvent(reservation, 'created', undefined, 'guest')
  notify(reservation, 'booking_received', 'Booking details emailed to you.')
  store.reservations.set(reservation.reference, reservation)
  store.idempotency.set(`res:${data.idempotencyKey}`, reservation.reference)

  // Mock switch: the first attempt "loses the connection" after the reservation was saved. The retry must not duplicate it.
  if (demos.has('neterror') && !store.failedOnce.has(data.idempotencyKey)) {
    store.failedOnce.add(data.idempotencyKey)
    return fail(503, { code: 'server', message: 'The connection dropped.' })
  }
  // The guest's browser gets a short-lived signed cookie bound to this reference, so the confirmation page can load without exposing details by reference alone.
  const created = NextResponse.json(toReservationResponse(reservation), { status: 201 })
  setAccessCookie(created, reservation.reference, 'checkout')
  return created
}
