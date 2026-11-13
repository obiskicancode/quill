/**
 * Availability lookup for a stay. Combines live room counts with the catalogue
 * rules (capacity, hidden prices, minimum stay) and, when a room is sold out,
 * offers nearby dates that have capacity.
 */
import { addDays, nightsBetween, todayISO } from '@/lib/dates';
import type { ISODate } from '@/types/dates.types';
import type {
  AvailabilityMap,
  DateSuggestion,
  RoomType,
  StayParams,
} from '@/types/rooms.types';

import { countAvailableRoomsByType } from '../db/repositories/rooms.repo';
import { isWeekendNight, maxGuests, nightlyPrice } from './catalog';

function totalFor(room: RoomType, checkIn: ISODate, nights: number): number {
  let total = 0;
  for (let i = 0; i < nights; i++)
    total += nightlyPrice(room, addDays(checkIn, i));
  return total;
}

/**
 * Resolves each room's availability status for the requested stay. Rooms are
 * checked in order of capacity, published price and minimum stay before live
 * counts; sold-out rooms get up to three alternative dates. `excludeReservationId`
 * keeps the guest's own reservation from blocking a modification.
 */
export async function fetchAvailability(
  stay: StayParams,
  rooms: RoomType[],
  excludeReservationId?: string,
): Promise<AvailabilityMap> {
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const availability = await countAvailableRoomsByType(
    rooms.map((r) => r.id),
    stay.checkIn,
    stay.checkOut,
    excludeReservationId,
  );
  const result: AvailabilityMap = {};

  const suggestionDates = rooms.flatMap(() =>
    [-2, -1, 1, 2, 3].map((offset) => addDays(stay.checkIn, offset)),
  );
  const uniqueDates = [...new Set(suggestionDates)].filter(
    (date) => date >= todayISO() && date !== stay.checkIn,
  );
  const suggestionsByDate = await Promise.all(
    uniqueDates.map(async (date) => ({
      date,
      availability: await countAvailableRoomsByType(
        rooms.map((r) => r.id),
        date,
        addDays(date, nights),
        excludeReservationId,
      ),
    })),
  );

  for (const room of rooms) {
    if (
      stay.adults > room.maxAdults ||
      stay.children > room.maxChildren ||
      stay.adults + stay.children > maxGuests(room)
    ) {
      result[room.id] = {
        status: 'over-capacity',
        maxAdults: room.maxAdults,
        maxChildren: room.maxChildren,
      };
      continue;
    }
    if (!room.showPrice) {
      result[room.id] = { status: 'on-request' };
      continue;
    }
    if (nights < room.minStayNights) {
      result[room.id] = {
        status: 'min-stay',
        minNights: room.minStayNights,
        suggestedCheckOut: addDays(stay.checkIn, room.minStayNights),
      };
      continue;
    }
    const count = availability.get(room.id);
    const remaining = count ? Math.max(0, count.available) : 0;
    if (remaining === 0) {
      const suggestions: DateSuggestion[] = [];
      for (const { date, availability: slots } of suggestionsByDate) {
        if ((slots.get(room.id)?.available ?? 0) <= 0) continue;
        suggestions.push({
          checkIn: date,
          checkOut: addDays(date, nights),
          totalNgn: totalFor(room, date, nights),
        });
        if (suggestions.length === 3) break;
      }
      result[room.id] = { status: 'sold-out', suggestions };
      continue;
    }
    const totalNgn = totalFor(room, stay.checkIn, nights);
    const weekendNights = Array.from({ length: nights }, (_, i) =>
      addDays(stay.checkIn, i),
    ).filter(isWeekendNight).length;
    result[room.id] = {
      status: 'available',
      remaining,
      nights,
      totalNgn,
      averageNgn: Math.round(totalNgn / nights),
      weekendNights: room.weekendPriceNgn !== null ? weekendNights : 0,
    };
  }
  return result;
}
