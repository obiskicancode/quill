import { ERROR_MESSAGES } from '@/constants/error-messages';

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
import type { RoomType } from './catalog';

export interface GalleryImage {
  src: string;
  alt: string;
  caption: string;
}

export interface RoomTestimonial {
  id: string;
  quote: string;
  guestName: string;
  stayType: string;
  rating: number;
}

export interface RateRule {
  label: string;
  /** "MM-DD". A range that wraps the new year (12-15 to 01-05) is supported. */
  start: string;
  end: string;
  upliftPercent: number;
}

export interface RoomDetail extends RoomType {
  active: boolean;
  basePriceMinor: number;
  weekendPriceMinor: number | null;
  extraBedPriceMinor: number | null;
  viewNotes: string;
  metaTitle: string | null;
  metaDescription: string | null;
  gallery: GalleryImage[];
  testimonials: RoomTestimonial[];
}

export interface HotelSettings {
  timeZone: string;
  checkInTime: string;
  checkOutTime: string;
  taxPercent: number;
  serviceChargePercent: number;
  minNights: number;
  maxNights: number;
  bookingWindowDays: number;
  /** Same-day bookings close at this local time ("HH:MM"). */
  sameDayCutoff: string;
  /** null = no free cancellation. */
  freeCancellationHours: number | null;
  cancellationSummary: string;
  childrenPolicy: string;
  petsPolicy: string;
  smokingPolicy: string;
  idPolicy: string;
  /** Show "Best price when you book direct" only if the hotel stands behind it. */
  bestPriceDirect: boolean;
  rateRules?: RateRule[];
}

export async function getPricingSettings(): Promise<HotelSettings> {
  const [row, rules] = await Promise.all([getHotelRow(), listRoomRateRules()]);
  if (!row) throw new Error(ERROR_MESSAGES.HOTEL_PRICING_SETTINGS_MISSING);
  return mapRoomHotelSettings(row, rules.map(mapRateRule));
}

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
