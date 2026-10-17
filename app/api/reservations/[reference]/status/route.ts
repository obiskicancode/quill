import { NextResponse } from 'next/server'
import { getAccess } from '@/lib/booking/session'
import { isDemoRef, loadReservation, statusOf } from '@/lib/booking/view'

/**
 * Polled by checkout and by the confirmation page. Needs the signed booking cookie (or the dev demo reference),
 * so a bare reference cannot be probed. The answer is the same whether the reference is unknown or not yours.
 */
export async function GET(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params
  const demo = new URL(req.url).searchParams.get('demo')
  const allowed = isDemoRef(reference) || (await getAccess(reference)) !== null
  const reservation = allowed ? await loadReservation(reference, demo) : null
  if (!reservation) return NextResponse.json({ code: 'not_found', message: 'Reservation not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(statusOf(reservation), { headers: { 'Cache-Control': 'no-store' } })
}
