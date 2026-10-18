import { getAccess } from '@/lib/booking/session'
import { isDemoRef, loadReservation } from '@/lib/booking/view'
import { apiFail, apiOk } from '@/app/api/envelope'
import type { BookingApiError, ResendResponse } from '@/types/booking.types'
import { logEvent, rateLimited } from '@/lib/checkout/mock-db'

const COOLDOWN_SECONDS = 60
const g = globalThis as unknown as { __deaResend?: Map<string, number> }
const lastSent = (g.__deaResend ??= new Map<string, number>())
const noStore = { 'Cache-Control': 'no-store' }

const unauthorised = () => {
  const error: BookingApiError = { code: 'unauthorised', message: 'Verify your booking first.' }
  return apiFail(401, error.message, error, { headers: noStore })
}

/** Re-sends the confirmation email. One per minute and three per hour per booking. MOCK: no email is sent. */
export async function POST(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params
  const demo = new URL(req.url).searchParams.get('demo')
  if (!isDemoRef(reference) && !(await getAccess(reference))) return unauthorised()
  const found = await loadReservation(reference, demo)
  if (!found) return unauthorised()

  const wait = demo === 'resend-limit' ? 45 : Math.ceil((COOLDOWN_SECONDS * 1000 - (Date.now() - (lastSent.get(reference) ?? 0))) / 1000)
  if (wait > 0 || rateLimited(`resend:${reference}`, 3, 60 * 60_000)) {
    const retryAfterSeconds = wait > 0 ? wait : 3600
    const error: BookingApiError = { code: 'rate_limited', message: 'Please wait before asking for another email.', retryAfterSeconds }
    return apiFail(429, error.message, error, { headers: { ...noStore, 'Retry-After': String(retryAfterSeconds) } })
  }
  if (demo === 'resend-fail') {
    const error: BookingApiError = { code: 'server', message: "We couldn't send the email." }
    return apiFail(503, error.message, error, { headers: noStore })
  }
  lastSent.set(reference, Date.now())
  logEvent(found, 'email_sent', 'Confirmation email sent again at your request.', 'guest')
  return apiOk<ResendResponse>({ sent: true, cooldownSeconds: COOLDOWN_SECONDS }, { headers: noStore })
}
