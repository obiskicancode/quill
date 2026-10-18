import { verifyRequestSchema } from '@/schemas/booking.schema'
import { createManageValue, readManageValue, setAccessCookie, setManageCookie } from '@/lib/booking/session'
import { buildGuestReservation, demoStored, isDemoRef } from '@/lib/booking/view'
import { apiFail, apiOk } from '@/app/api/envelope'
import type { BookingApiError } from '@/types/booking.types'
import { rateLimited, refresh, store } from '@/lib/checkout/mock-db'

const noStore = { 'Cache-Control': 'no-store' }
const GENERIC = "We couldn't find a booking with those details. Check the reference and email and try again."

/**
 * Proves the guest owns the booking with the reference plus the email used.
 * Rate-limited per client (5 tries per 10 minutes). Every failure returns the same message, so it cannot be used to guess bookings.
 */
export async function POST(req: Request) {
  const client = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (rateLimited(`verify:${client}`, 5, 10 * 60_000)) {
    const error: BookingApiError = { code: 'rate_limited', message: 'Too many attempts. Please wait before trying again.', retryAfterSeconds: 600 }
    return apiFail(429, error.message, error, { headers: { ...noStore, 'Retry-After': '600' } })
  }
  const parsed = verifyRequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const error: BookingApiError = { code: 'not_verified', message: GENERIC }
    return apiFail(401, error.message, error, { headers: noStore })
  }

  const { reference, email, scope } = parsed.data

  // Dev preview only: the demo booking verifies with its sample email.
  if (isDemoRef(reference) && email === 'ada.obi@example.com') {
    const demo = buildGuestReservation(await demoStored('confirmed'), 'verified', scope === 'manage' ? { manage: { csrf: 'demo-csrf', expiresAt: Date.now() + 30 * 60_000 } } : {})
    return apiOk(demo, { headers: noStore })
  }

  const reservation = store.reservations.get(reference)
  if (!reservation || reservation.guest.email !== email) {
    const error: BookingApiError = { code: 'not_verified', message: GENERIC }
    return apiFail(401, error.message, error, { headers: noStore })
  }
  if (scope === 'manage') {
    // A 30-minute management session. The body carries the CSRF token the browser must send with every change.
    const value = createManageValue(reference)
    const session = readManageValue(reference, value)!
    const res = apiOk(buildGuestReservation(refresh(reservation), 'verified', { manage: { csrf: session.csrf, expiresAt: session.expiresAt } }), { headers: noStore })
    setManageCookie(res, reference, value)
    return res
  }
  const res = apiOk(buildGuestReservation(refresh(reservation), 'verified'), { headers: noStore })
  setAccessCookie(res, reference, 'verified')
  return res
}
