import { NextResponse, type NextRequest } from 'next/server'
import { parseRoomQuery } from '@/lib/room-query'
import { getRoomDetail } from '@/lib/room-detail'
import { getQuoteResponse, hotelClock } from '@/lib/stay-quote'
import { QUOTE_DEMOS, type QuoteDemo } from '@/lib/stay-types'

/** Server-side price breakdown for the chosen dates. The booking card only displays what this returns. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const room = getRoomDetail(slug)
  if (!room) return NextResponse.json({ error: 'not-found' }, { status: 404 })

  const sp = req.nextUrl.searchParams
  const q = parseRoomQuery(sp)
  if (!q.checkIn || !q.checkOut) return NextResponse.json({ error: 'dates-required' }, { status: 400 })

  const rawDemo = sp.get('demo')
  const demo = QUOTE_DEMOS.includes(rawDemo as QuoteDemo) ? (rawDemo as QuoteDemo) : null

  try {
    const body = await getQuoteResponse(
      room,
      { checkIn: q.checkIn, checkOut: q.checkOut, adults: q.adults, children: q.children, extraBed: sp.get('extraBed') === '1' },
      demo,
      hotelClock(new Date(), demo),
    )
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
