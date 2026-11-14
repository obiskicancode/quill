import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { hotelClock } from '@/lib/dates';
import { checkBlockConflicts } from '@/lib/db/repositories/calendar-admin.repo';
import {
  getReservationAdminDetail,
  listAvailableRoomsForStay,
} from '@/lib/db/repositories/reservations.repo';
import { getRoomTypeById } from '@/lib/db/repositories/rooms.repo';
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

  const res = await getReservationAdminDetail(
    id,
    hotelClock().today,
    { canViewGuestContact: false, canViewPayments: false },
    new Date(),
    guard.context.role,
  );

  if (!res) return apiFail(404, ERROR_MESSAGES.RESERVATION_NOT_FOUND_BARE);

  const roomType = await getRoomTypeById(res.roomTypeId);
  if (!roomType) return apiFail(404, ERROR_MESSAGES.RESERVATION_NOT_FOUND_BARE);

  const { checkIn, checkOut, extraBed } = parsed.data;

  try {
    const conflicts = await checkBlockConflicts({
      roomIds: [res.roomId],
      startDate: checkIn,
      endDate: checkOut,
      excludeReservationId: id,
    });

    const currentRoomAvailable = conflicts.ok;

    const candidateRooms = await listAvailableRoomsForStay(
      res.roomTypeId,
      checkIn,
      checkOut,
      id,
    );

    const quote = await buildCheckoutQuote({
      room: roomType.slug,
      checkIn,
      checkOut,
      adults: res.adults,
      children: res.children,
      extraBed: extraBed ?? false,
      extras: [],
    });

    if (quote.status !== 'ok') {
      return apiFail(400, ERROR_MESSAGES.PRICING_QUOTE_ERROR(quote.status));
    }

    const newTotalMinor = quote.breakdown.totalMinor;
    const currentPaid = res.amountPaidMinor - res.amountRefundedMinor;
    const diffMinor = newTotalMinor - res.totalMinor;
    const balanceWithPaid = newTotalMinor - currentPaid;

    return apiOk({
      quote,
      currentRoomAvailable,
      candidateRooms,
      comparison: {
        currentTotalMinor: res.totalMinor,
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
