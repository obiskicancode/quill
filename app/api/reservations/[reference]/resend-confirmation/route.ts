import { NextResponse } from 'next/server'
import { getAccess } from '@/lib/booking/session'
import { isDemoRef, loadReservation } from '@/lib/booking/view'
import type { BookingApiError, ResendResponse } from '@/types/booking.types'
import { logEvent, rateLimited } from '@/lib/checkout/mock-db'

const COOLDOWN_SECONDS = 60
const g = globalThis as unknown as { __deaResend?: Map<string, number> }
const lastSent = (g.__deaResend ??= new Map<string, number>())
const noStore = { 'Cache-Control': 'no-store' }

/** Re-sends the confirmation email. One per minute and three per hour per booking. MOCK: no email is sent. */
export async function POST(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params
  const demo = new URL(req.url).searchParams.get('demo')
  if (!isDemoRef(reference) && !(await getAccess(reference))) {
    return NextResponse.json<BookingApiError>({ code: 'unauthorised', message: 'Verify your booking first.' }, { status: 401, headers: noStore })
  }
  const found = await loadReservation(reference, demo)
  if (!found) {
    return NextResponse.json<BookingApiError>({ code: 'unauthorised', message: 'Verify your booking first.' }, { status: 401, headers: noStore })
  }

  const wait = demo === 'resend-limit' ? 45 : Math.ceil((COOLDOWN_SECONDS * 1000 - (Date.now() - (lastSent.get(reference) ?? 0))) / 1000)
  if (wait > 0 || rateLimited(`resend:${reference}`, 3, 60 * 60_000)) {
    const retryAfterSeconds = wait > 0 ? wait : 3600
    return NextResponse.json<BookingApiError>(
      { code: 'rate_limited', message: 'Please wait before asking for another email.', retryAfterSeconds },
      { status: 429, headers: { ...noStore, 'Retry-After': String(retryAfterSeconds) } },
    )
  }
  if (demo === 'resend-fail') {
    return NextResponse.json<BookingApiError>({ code: 'server', message: "We couldn't send the email." }, { status: 503, headers: noStore })
  }
  lastSent.set(reference, Date.now())
  logEvent(found, 'email_sent', 'Confirmation email sent again at your request.', 'guest')
  return NextResponse.json<ResendResponse>({ sent: true, cooldownSeconds: COOLDOWN_SECONDS }, { headers: noStore })
}
