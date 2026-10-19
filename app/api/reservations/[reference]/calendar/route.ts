import { NextResponse } from 'next/server';

import { buildIcs } from '@/lib/booking/ics';
import { getAccess } from '@/lib/booking/session';
import { isDemoRef, loadReservation } from '@/lib/booking/view';
import { rateLimited } from '@/lib/checkout/mock-db';

/** Downloads the stay as an .ics file (hotel name, address, check-in time, a reminder the day before, the reference). */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  const demo = new URL(req.url).searchParams.get('demo');
  const client =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(`calendar:${client}`, 20, 60_000))
    return new NextResponse('Too many requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  if (!isDemoRef(reference) && !(await getAccess(reference)))
    return new NextResponse('Not found', { status: 404 });

  const r = await loadReservation(reference, demo);
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
      'Cache-Control': 'no-store',
    },
  });
}
