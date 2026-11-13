/**
 * Room detail and pricing lookups for the public room pages.
 */

import { ERROR_MESSAGES } from '@/constants/error-messages';
import type {
  HotelPricingSettings,
  RoomDetail,
  RoomType,
} from '@/types/rooms.types';

import {
  mapRateRule,
  mapRoomDetail,
  mapRoomHotelSettings,
} from '../db/mappers/rooms.mapper';
import {
  getHotelRow,
  getRoomRelations,
  getRoomTypesWithDetails,
} from '../db/queries/content-data';
import { listRoomRateRules } from '../db/repositories/rooms.repo';

/** Loads hotel pricing settings, failing if the singleton row is missing. */
export async function getPricingSettings(): Promise<HotelPricingSettings> {
  const [row, rules] = await Promise.all([getHotelRow(), listRoomRateRules()]);
  if (!row) throw new Error(ERROR_MESSAGES.HOTEL_PRICING_SETTINGS_MISSING);
  return mapRoomHotelSettings(row, rules.map(mapRateRule));
}

/** Loads a published room's detail by slug, or null when it is missing. */
export async function getRoomDetail(slug: string): Promise<RoomDetail | null> {
  const [rows, relations] = await Promise.all([
    getRoomTypesWithDetails(),
    getRoomRelations(),
  ]);
  const found = rows.find((r) => r.row.slug === slug);
  return found ? mapRoomDetail(found.row, relations) : null;
}

/** Other rooms closest in price to this one (rooms with no public price rank last). */
export async function getSimilarRooms(
  room: RoomType,
  count = 3,
): Promise<RoomType[]> {
  const rows = await getRoomTypesWithDetails();
  const distance = (r: RoomType) =>
    r.showPrice && room.showPrice
      ? Math.abs(r.basePriceNgn - room.basePriceNgn)
      : Number.MAX_SAFE_INTEGER;
  return rows
    .map((r) => r.room)
    .filter((r) => r.slug !== room.slug)
    .sort((a, b) => distance(a) - distance(b))
    .slice(0, count);
}

export { baseGuests, groupAmenities, toFeatureRoom } from './catalog';
