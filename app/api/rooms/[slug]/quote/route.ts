import { type NextRequest } from 'next/server';

import { apiFail, apiOk } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { getRoomDetail } from '@/lib/room-detail';
import { parseRoomQuery } from '@/lib/room-query';
import { getQuoteResponse, hotelClock } from '@/lib/stay-quote';

/** Server-side price breakdown for the chosen dates. The booking card only displays what this returns. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const room = await getRoomDetail(slug);
  if (!room)
    return apiFail(404, ERROR_MESSAGES.ROOM_NOT_FOUND, {
      code: ERROR_CODES.NOT_FOUND,
    });

  const sp = req.nextUrl.searchParams;
  const q = parseRoomQuery(sp);
  if (!q.checkIn || !q.checkOut)
    return apiFail(400, ERROR_MESSAGES.CHOOSE_DATES, {
      code: ERROR_CODES.DATES_REQUIRED,
    });

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
      hotelClock(new Date()),
    );
    return apiOk(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return apiFail(503, ERROR_MESSAGES.PRICING_UNAVAILABLE, {
      code: ERROR_CODES.UNAVAILABLE,
    });
  }
}
