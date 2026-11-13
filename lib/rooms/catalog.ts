/**
 * Room catalogue rules shared by the listing, detail and pricing pages: display
 * labels, filter matching, sorting, price bands and the nightly/weekend rate.
 * Prices here are naira; the checkout quote works in minor units.
 */
import type {
  BedType,
  FilterAmenity,
  RoomAmenityKey,
  RoomFilters,
  RoomType,
  SortKey,
} from '@/types/rooms.types';
import type { AmenityKey, Room } from '@/types/site.types';

/** Guest-facing labels for every room amenity key. */
export const roomAmenityLabels: Record<RoomAmenityKey, string> = {
  wifi: 'Wi-Fi',
  parking: 'Free parking',
  restaurant: 'Restaurant',
  pool: 'Pool',
  power: '24/7 power',
  security: 'Security',
  conference: 'Conference room',
  airport: 'Airport transfer',
  ac: 'Air conditioning',
  tv: 'Smart TV',
  kitchen: 'Kitchen',
  breakfast: 'Breakfast',
  laundry: 'Laundry',
  workdesk: 'Work desk',
  kitchenette: 'Kitchenette',
  balcony: 'Balcony',
};
/** Guest-facing labels for each bed type. */
export const bedTypeLabels: Record<BedType, string> = {
  queen: 'Queen bed',
  king: 'King bed',
  twin: 'Twin beds',
  double: 'Double beds',
};

/** Amenities offered as quick filters in the room list. */
export const filterAmenityOptions: { key: FilterAmenity; label: string }[] = [
  { key: 'ac', label: 'Air conditioning' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'kitchenette', label: 'Kitchenette' },
  { key: 'balcony', label: 'Balcony' },
  { key: 'breakfast', label: 'Breakfast included' },
];

/** Sort choices shown in the room list, in display order. */
export const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price-asc', label: 'Price low to high' },
  { key: 'price-desc', label: 'Price high to low' },
  { key: 'capacity', label: 'Capacity' },
];

/** Neutral room filters used when no query values are supplied. */
export const emptyFilters: RoomFilters = {
  minPrice: null,
  maxPrice: null,
  minGuests: null,
  beds: [],
  amenities: [],
};

/** Total guest capacity of a room type. */
export const maxGuests = (room: RoomType) => room.maxAdults + room.maxChildren;

/** Counts the filter groups that currently narrow the room list. */
export function countActiveFilters(f: RoomFilters): number {
  return (
    (f.minPrice !== null || f.maxPrice !== null ? 1 : 0) +
    (f.minGuests !== null ? 1 : 0) +
    f.beds.length +
    f.amenities.length
  );
}

/** Rooms whose price is hidden always pass the price filter, because the hotel has not published a number to compare. */
export function matchesFilters(room: RoomType, f: RoomFilters): boolean {
  if (room.showPrice) {
    if (f.minPrice !== null && room.basePriceNgn < f.minPrice) return false;
    if (f.maxPrice !== null && room.basePriceNgn > f.maxPrice) return false;
  }
  if (f.minGuests !== null && maxGuests(room) < f.minGuests) return false;
  if (f.beds.length > 0 && !f.beds.includes(room.bedType)) return false;
  return f.amenities.every((key) =>
    key === 'breakfast' ? room.breakfastIncluded : room.amenities.includes(key),
  );
}

const PRICE_BAND_STEP = 5000;

/** A price filter band with inclusive bounds in naira. */
export type PriceBand = { minPrice: number | null; maxPrice: number | null };

/**
 * Up to three price bands cut on ₦5,000 lines from the live bounds, so the
 * panel offers real shortcuts instead of a slider nobody can aim at. Empty when
 * the catalogue is flat or narrow enough that no band would exclude a room.
 */
export function priceBands(
  bounds: { min: number; max: number } | null,
): PriceBand[] {
  if (!bounds || bounds.max <= bounds.min) return [];
  const cut = (share: number) =>
    Math.round(
      (bounds.min + (bounds.max - bounds.min) * share) / PRICE_BAND_STEP,
    ) * PRICE_BAND_STEP;
  const low = cut(1 / 3);
  const high = cut(2 / 3);
  if (!(bounds.min < low && low < high && high < bounds.max)) return [];
  return [
    { minPrice: null, maxPrice: low },
    { minPrice: low, maxPrice: high },
    { minPrice: high, maxPrice: null },
  ];
}

/** Hidden-price rooms go last when sorting by price. */
export function sortRooms(rooms: RoomType[], sort: SortKey): RoomType[] {
  const list = [...rooms];
  const price = (r: RoomType) => (r.showPrice ? r.basePriceNgn : Number.NaN);
  if (sort === 'price-asc' || sort === 'price-desc') {
    const dir = sort === 'price-asc' ? 1 : -1;
    list.sort((a, b) => {
      const pa = price(a);
      const pb = price(b);
      if (Number.isNaN(pa) && Number.isNaN(pb)) return 0;
      if (Number.isNaN(pa)) return 1;
      if (Number.isNaN(pb)) return -1;
      return (pa - pb) * dir;
    });
  } else if (sort === 'capacity') {
    list.sort(
      (a, b) => maxGuests(b) - maxGuests(a) || a.name.localeCompare(b.name),
    );
  }
  return list;
}

/** Weekend rate applies to Friday and Saturday nights. */
export function isWeekendNight(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 5 || day === 6;
}

/** The public nightly price to display, or null when the room hides its price. */
export function nightlyPrice(room: RoomType, iso: string): number {
  return isWeekendNight(iso) && room.weekendPriceNgn !== null
    ? room.weekendPriceNgn
    : room.basePriceNgn;
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

/** Groups amenity keys into the display sections used by room pages. */
export function groupAmenities(
  keys: RoomAmenityKey[],
): { title: string; keys: RoomAmenityKey[] }[] {
  return GROUPS.map((g) => ({
    title: g.title,
    keys: g.keys.filter((k) => keys.includes(k)),
  })).filter((g) => g.keys.length > 0);
}
