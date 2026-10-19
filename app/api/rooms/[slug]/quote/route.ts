import { type NextRequest } from 'next/server';

import { apiFail, apiOk } from '@/app/api/envelope';
import { getRoomDetail } from '@/lib/room-detail';
import { parseRoomQuery } from '@/lib/room-query';
import { getQuoteResponse, hotelClock } from '@/lib/stay-quote';
import { QUOTE_DEMOS, type QuoteDemo } from '@/types/stay.types';

/** Server-side price breakdown for the chosen dates. The booking card only displays what this returns. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const room = getRoomDetail(slug);
  if (!room) return apiFail(404, 'Room not found.', { code: 'not_found' });

  const sp = req.nextUrl.searchParams;
  const q = parseRoomQuery(sp);
  if (!q.checkIn || !q.checkOut)
    return apiFail(400, 'Choose your dates.', { code: 'dates_required' });

  const rawDemo = sp.get('demo');
  const demo = QUOTE_DEMOS.includes(rawDemo as QuoteDemo)
    ? (rawDemo as QuoteDemo)
    : null;

  try {
    const body = await getQuoteResponse(
      room,
      {
        checkIn: q.checkIn,
        checkOut: q.checkOut,
        adults: q.adults,
        children: q.children,
        extraBed: sp.get('extraBed') === '1',
      },
      demo,
      hotelClock(new Date(), demo),
    );
    return apiOk(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return apiFail(503, 'Pricing is unavailable.', { code: 'unavailable' });
  }
}
