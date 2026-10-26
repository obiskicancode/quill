import { type NextRequest } from 'next/server';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { getRoomTypesWithDetails } from '@/lib/db/queries/content-data';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { fetchAvailability } from '@/lib/rooms/availability';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Live availability for a set of rooms on the chosen dates. The card list only ever displays what this returns. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const checkIn = sp.get('checkIn');
  const checkOut = sp.get('checkOut');
  if (!checkIn || !checkOut || !ISO.test(checkIn) || !ISO.test(checkOut)) {
    return apiFail(400, ERROR_MESSAGES.CHOOSE_DATES, {
      code: ERROR_CODES.DATES_REQUIRED,
    });
  }

  const adults = Number(sp.get('adults') ?? 2);
  const children = Number(sp.get('children') ?? 0);
  if (
    !Number.isInteger(adults) ||
    adults < 1 ||
    !Number.isInteger(children) ||
    children < 0
  ) {
    return apiFail(400, ERROR_MESSAGES.CHECK_GUEST_COUNT, {
      code: ERROR_CODES.INVALID_GUESTS,
    });
  }

  // The client sends ids; the server decides which rooms exist and what they cost.
  const wanted = (sp.get('rooms') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allRooms = (await getRoomTypesWithDetails()).map((r) => r.room);
  const rooms =
    wanted.length > 0
      ? allRooms.filter((r) => wanted.includes(r.id))
      : allRooms;
  if (rooms.length === 0)
    return apiFail(400, ERROR_MESSAGES.NO_ROOMS_FOR_DATES, {
      code: ERROR_CODES.ROOMS_REQUIRED,
    });

  try {
    const map = await fetchAvailability(
      { checkIn, checkOut, adults, children },
      rooms,
    );
    return apiOk(map, { noCache: true });
  } catch {
    return apiFail(503, ERROR_MESSAGES.AVAILABILITY_UNAVAILABLE, {
      code: ERROR_CODES.UNAVAILABLE,
    });
  }
}
