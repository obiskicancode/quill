import { getAccess } from '@/lib/booking/session'
import { manageOpts } from '@/lib/manage/auth'
import { buildGuestReservation, isDemoRef, loadReservation } from '@/lib/booking/view'
import { apiFail, apiOk } from '@/app/api/envelope'
import type { BookingApiError } from '@/types/booking.types'

const deny = () => {
  const error: BookingApiError = { code: 'unauthorised', message: 'Verify your booking to see it.' }
  return apiFail(401, error.message, error, { headers: { 'Cache-Control': 'no-store' } })
}

/** The guest-visible reservation. Needs the signed cookie; email and phone are masked unless the guest verified. */
export async function GET(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params
  const demo = new URL(req.url).searchParams.get('demo')
  const params = new URL(req.url).searchParams
  const level = isDemoRef(reference) ? (demo === 'verified' ? 'verified' : 'checkout') : await getAccess(reference)
  if (!level) return deny()
  // A manage session (or the dev preview with manage=1) adds the allowed actions, activity timeline and CSRF token.
  const manage = isDemoRef(reference) && params.get('manage') !== '1' ? undefined : await manageOpts(reference)
  try {
    const reservation = await loadReservation(reference, demo)
    if (!reservation) return deny() // unknown references look exactly like missing access
    return apiOk(buildGuestReservation(reservation, level, { manage }), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    const error: BookingApiError = { code: 'server', message: 'We could not load your booking.' }
    return apiFail(503, error.message, error)
  }
}
