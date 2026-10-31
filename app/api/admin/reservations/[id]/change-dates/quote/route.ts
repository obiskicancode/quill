import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import { reservations, roomTypes } from '@/db/schema';
import { guardAdminApi } from '@/lib/auth/guards';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { listAvailableRoomsForStay } from '@/lib/db/repositories/reservations.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { changeDatesQuoteSchema } from '@/schemas/reservation.schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.change_dates',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, ERROR_MESSAGES.MISSING_RESERVATION_ID);

  const body = await request.json().catch(() => null);
  const parsed = changeDatesQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_DATE_QUOTE_REQUEST,
      parsed.error.flatten(),
    );
  }

  const [res] = await db
    .select({
      res: reservations,
      roomSlug: roomTypes.slug,
    })
    .from(reservations)
    .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id))
    .where(eq(reservations.id, id))
    .limit(1);

  if (!res) return apiFail(404, ERROR_MESSAGES.RESERVATION_NOT_FOUND_BARE);

  const { checkIn, checkOut, extraBed } = parsed.data;

  try {
    // 1. Check if current room is available
    const conflictRes = await db.execute(sql`
      SELECT 1 FROM reservations x
      WHERE x.room_id = ${res.res.roomId}
        AND x.id != ${id}
        AND x.status IN ('pending', 'confirmed', 'checked_in')
        AND daterange(x.check_in, x.check_out, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')
      LIMIT 1
    `);

    const conflictBlock = await db.execute(sql`
      SELECT 1 FROM room_blocks b
      WHERE b.room_id = ${res.res.roomId}
        AND daterange(b.start_date, b.end_date, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')
      LIMIT 1
    `);

    const currentRoomAvailable =
      conflictRes.rows.length === 0 && conflictBlock.rows.length === 0;

    // 2. Fetch alternative available rooms if needed
    const candidateRooms = await listAvailableRoomsForStay(
      res.res.roomTypeId,
      checkIn,
      checkOut,
      id,
    );

    // 3. Compute Quote
    const quote = await buildCheckoutQuote({
      room: res.roomSlug,
      checkIn,
      checkOut,
      adults: res.res.adults,
      children: res.res.children,
      extraBed: extraBed ?? false,
      extras: [],
    });

    if (quote.status !== 'ok') {
      return apiFail(400, ERROR_MESSAGES.PRICING_QUOTE_ERROR(quote.status));
    }

    const newTotalMinor = quote.breakdown.totalMinor;
    const currentPaid = res.res.amountPaidMinor - res.res.amountRefundedMinor;
    const diffMinor = newTotalMinor - res.res.totalMinor;
    const balanceWithPaid = newTotalMinor - currentPaid;

    return apiOk({
      quote,
      currentRoomAvailable,
      candidateRooms,
      comparison: {
        currentTotalMinor: res.res.totalMinor,
        newTotalMinor,
        diffMinor,
        guestOwesMinor: Math.max(0, balanceWithPaid),
        refundDueMinor: Math.max(0, -balanceWithPaid),
        noDifference: balanceWithPaid === 0,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_QUOTE_STAY_CHANGE;
    return apiFail(400, message);
  }
}
