import { NextResponse } from 'next/server';

import { buildIcs } from '@/lib/booking/ics';
import { getAccess } from '@/lib/booking/session';
import { loadReservation } from '@/lib/booking/view';
import { NO_STORE_HEADERS } from '@/lib/http/envelope';
import { clientIp, tooManyRequests } from '@/lib/http/request';
import { rateLimit } from '@/lib/rate-limit';

/** Downloads the stay as an .ics file (hotel name, address, check-in time, a reminder the day before, the reference). */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const client = clientIp(req) ?? 'local';
  if (!(await rateLimit(`calendar:${client}`, 20, 60_000)).allowed)
    return tooManyRequests(60);
  if (!(await getAccess(reference)))
    return new NextResponse('Not found', { status: 404 });

  const r = await loadReservation(reference);
  if (!r || !r.stay.checkIn || !r.stay.checkOut)
    return new NextResponse('Not found', { status: 404 });

  const { hotel, times } = r.snapshot;
  const ics = buildIcs({
    reference: r.reference,
    hotelName: hotel.name,
    address: hotel.addressLines.join(', '),
    checkIn: r.stay.checkIn,
    checkOut: r.stay.checkOut,
    checkInTime: times.checkIn24,
    checkOutTime: times.checkOut24,
    timeZone: times.timeZone,
    guestsLabel: `${r.stay.adults + r.stay.children} guests`,
  });
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="booking-${r.reference}.ics"`,
      ...NO_STORE_HEADERS,
    },
  });
}
