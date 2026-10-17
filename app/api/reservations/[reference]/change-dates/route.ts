import { NextResponse } from 'next/server'
import { buildGuestReservation, loadReservation } from '@/lib/booking/view'
import { store } from '@/lib/checkout/mock-db'
import { fieldErrorsFrom } from '@/lib/checkout/schemas'
import { commitChange } from '@/lib/manage/actions'
import { manageError, manageOpts, replayKey, requireManage } from '@/lib/manage/auth'
import { changeDatesRequestSchema } from '@/lib/manage/schemas'
import { hotelClock } from '@/lib/stay-quote'

/**
 * Confirms the new dates from a quote. Re-checks the rules, availability and price on the server. If more must be paid
 * it returns payment_required and holds the new dates while the old dates stay valid; the guest then pays through
 * the same payment endpoint as checkout. Idempotent: a repeat with the same key changes nothing.
 */
export async function POST(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params
  const demo = new URL(req.url).searchParams.get('demo')
  const auth = await requireManage(req, reference, demo)
  if (!auth.ok) return auth.res

  const parsed = changeDatesRequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return manageError(422, { code: 'validation', message: 'Something is missing from the request.', fieldErrors: fieldErrorsFrom(parsed.error) })
  const { idempotencyKey, quoteId } = parsed.data

  const r = await loadReservation(reference, demo)
  if (!r) return manageError(404, { code: 'not_found', message: 'Booking not found.' })
  const opts = await manageOpts(reference)
  const respond = (status: 'completed' | 'payment_required') =>
    NextResponse.json({ status, view: buildGuestReservation(r, 'verified', { manage: opts }) }, { headers: { 'Cache-Control': 'no-store' } })

  const key = replayKey('chg', idempotencyKey)
  const earlier = store.results.get(key) as 'completed' | 'payment_required' | undefined
  if (earlier) return respond(earlier)

  const demos = new Set((demo ?? '').split(',').map((t) => t.trim()))
  const outcome = await commitChange(r, quoteId, hotelClock(), demos)
  if (outcome.status === 'not_allowed') return manageError(409, { code: 'not_allowed', message: outcome.reason })
  if (outcome.status === 'stale') return NextResponse.json({ code: 'quote_stale', message: 'The price or availability changed. Please review the new details.', quote: outcome.quote }, { status: 409, headers: { 'Cache-Control': 'no-store' } })

  store.results.set(key, outcome.status)
  if (demos.has('changeerror') && !store.failedOnce.has(key)) {
    store.failedOnce.add(key)
    return manageError(503, { code: 'server', message: 'The connection dropped.' })
  }
  return respond(outcome.status)
}
