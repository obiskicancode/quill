import type { AmenityKey, Room } from '@/types/site.types';

import {
  maxGuests,
  roomTypes,
  type RoomAmenityKey,
  type RoomType,
} from './rooms';

/*
 * MOCK DATABASE LAYER. Replace getRoomDetail / getSimilarRooms with real queries.
 * Money here is integer minor units (kobo), as it will be in the database.
 * Everything marked [sample] is placeholder content to replace before launch.
 */

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
}

export const hotelSettings: HotelSettings = {
  timeZone: 'Africa/Lagos',
  checkInTime: '[2:00 pm]',
  checkOutTime: '[12:00 noon]',
  taxPercent: 7.5, // [sample]
  serviceChargePercent: 5, // [sample]
  minNights: 1,
  maxNights: 30,
  bookingWindowDays: 365,
  sameDayCutoff: '18:00', // [sample]
  freeCancellationHours: 48, // [sample]
  cancellationSummary:
    '[Add a short summary, for example: free cancellation up to 48 hours before arrival; after that the first night is charged.]',
  childrenPolicy:
    '[Children of any age are welcome. Children under 12 stay free in existing beds.]',
  petsPolicy: '[Pets are not allowed.]',
  smokingPolicy: '[Smoking is not allowed in rooms.]',
  idPolicy:
    '[A valid government-issued photo ID is required for every adult at check-in.]',
  bestPriceDirect: true, // [confirm with the hotel]
};

export const rateRules: RateRule[] = [
  { label: 'Peak season', start: '12-15', end: '01-05', upliftPercent: 20 }, // [sample]
];

const viewNotes: Record<string, string> = {
  'classic-room': 'Courtyard view, first floor',
  'deluxe-room': 'Balcony over the garden, second floor',
  'executive-suite': 'Corner suite with city view, third floor',
  'one-bedroom-apartment': 'Quiet side of the building, second floor',
  'twin-room': 'Courtyard view, first floor',
  'family-apartment': 'Garden view, ground floor',
  'studio-apartment': 'Street view, second floor',
  'two-bedroom-apartment': 'Top-floor apartment with city view',
};

const meta: Record<string, { title: string; description: string }> = {
  'deluxe-room': {
    title: 'Deluxe Room with balcony and breakfast',
    description:
      'A 28 sqm king-bed room with a private balcony, work desk and breakfast included. Check dates and book direct.',
  },
};

const captions = [
  'The bedroom',
  'Seating and work area',
  'The bathroom',
  'Natural light by the window',
  'Balcony',
  'Entrance',
  'Kitchenette',
  'Living area',
];

const testimonialsBySlug: Record<string, RoomTestimonial[]> = {
  'deluxe-room': [
    {
      id: 'rt1',
      quote:
        '[Sample quote] The balcony and the quiet made the stay. Breakfast was a good start every morning.',
      guestName: 'Chidinma O.',
      stayType: 'Business trip',
      rating: 5,
    },
    {
      id: 'rt2',
      quote:
        '[Sample quote] Clean, comfortable, and the bed was excellent. Easy check-in.',
      guestName: 'Tunde A.',
      stayType: "Couple's getaway",
      rating: 4,
    },
  ],
  'classic-room': [
    {
      id: 'rt3',
      quote: '[Sample quote] Simple, quiet and good value for a short stay.',
      guestName: 'Hauwa M.',
      stayType: 'Business trip',
      rating: 4,
    },
  ],
};

const inactiveSlugs = new Set<string>(); // add a slug here to preview the 404 for an inactive room

export function getRoomDetail(slug: string): RoomDetail | null {
  const rt = roomTypes.find((r) => r.slug === slug);
  if (!rt || inactiveSlugs.has(slug)) return null;
  const m = meta[slug];
  return {
    ...rt,
    active: true,
    basePriceMinor: rt.basePriceNgn * 100,
    weekendPriceMinor:
      rt.weekendPriceNgn === null ? null : rt.weekendPriceNgn * 100,
    extraBedPriceMinor: rt.extraBed.available
      ? (rt.extraBed.feeNgn ?? 0) * 100
      : null,
    viewNotes: viewNotes[slug] ?? '[View and floor to be added]',
    metaTitle: m?.title ?? null,
    metaDescription: m?.description ?? null,
    gallery: rt.images.map((img, i) => ({
      src: img.src,
      alt: img.alt,
      caption: captions[i] ?? `Photo ${i + 1}`,
    })),
    testimonials: testimonialsBySlug[slug] ?? [],
  };
}

/** Other rooms closest in price to this one (rooms with no public price rank last). */
export function getSimilarRooms(room: RoomType, count = 3): RoomType[] {
  const distance = (r: RoomType) =>
    r.showPrice && room.showPrice
      ? Math.abs(r.basePriceNgn - room.basePriceNgn)
      : Number.MAX_SAFE_INTEGER;
  return roomTypes
    .filter((r) => r.slug !== room.slug)
    .sort((a, b) => distance(a) - distance(b))
    .slice(0, count);
}

/** Adapts a listing room type to the home page card's shape. */
export function toFeatureRoom(rt: RoomType): Room {
  const amenities: AmenityKey[] = rt.amenities.flatMap(
    (k: RoomAmenityKey): AmenityKey[] =>
      k === 'balcony' ? [] : k === 'kitchenette' ? ['kitchen'] : [k],
  );
  return {
    id: rt.id,
    slug: rt.slug,
    name: rt.name,
    bedType: rt.bedConfig,
    maxGuests: maxGuests(rt),
    amenities,
    priceNgn: rt.showPrice ? rt.basePriceNgn : null,
    priceHidden: !rt.showPrice,
    images: rt.images,
  };
}

/** Guests above this number need the extra bed (when the room has one). */
export const baseGuests = (room: RoomType): number =>
  maxGuests(room) - (room.extraBed.available ? 1 : 0);

const GROUPS: { title: string; keys: RoomAmenityKey[] }[] = [
  { title: 'In the room', keys: ['ac', 'tv', 'wifi', 'workdesk', 'laundry'] },
  {
    title: 'Kitchen and dining',
    keys: ['kitchenette', 'kitchen', 'breakfast', 'restaurant'],
  },
  {
    title: 'Building and safety',
    keys: ['power', 'security', 'parking', 'pool', 'conference', 'airport'],
  },
  { title: 'Outdoors', keys: ['balcony'] },
];

export function groupAmenities(
  keys: RoomAmenityKey[],
): { title: string; keys: RoomAmenityKey[] }[] {
  return GROUPS.map((g) => ({
    title: g.title,
    keys: g.keys.filter((k) => keys.includes(k)),
  })).filter((g) => g.keys.length > 0);
}
