import type { AmenityKey, ImageAsset } from '@/types/site.types';

export type RoomAmenityKey = AmenityKey | 'kitchenette' | 'balcony';
export type BedType = 'queen' | 'king' | 'twin' | 'double';

export interface ExtraBed {
  available: boolean;
  /** 0 means free. null when not available. */
  feeNgn: number | null;
}

export interface RoomType {
  id: string;
  slug: string;
  name: string;
  description: string;
  bedConfig: string;
  bedType: BedType;
  sizeSqm: number;
  maxAdults: number;
  maxChildren: number;
  extraBed: ExtraBed;
  basePriceNgn: number;
  /** Applied to Friday and Saturday nights. */
  weekendPriceNgn: number | null;
  /** false when the hotel hides the price ("Contact us for price"). */
  showPrice: boolean;
  breakfastIncluded: boolean;
  taxesIncluded: boolean;
  minStayNights: number;
  popular: boolean;
  amenities: RoomAmenityKey[];
  /** 1 to 8 images. */
  images: ImageAsset[];
}

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
export const bedTypeLabels: Record<BedType, string> = {
  queen: 'Queen bed',
  king: 'King bed',
  twin: 'Twin beds',
  double: 'Double beds',
};

export type FilterAmenity =
  'ac' | 'wifi' | 'kitchenette' | 'balcony' | 'breakfast';

export const filterAmenityOptions: { key: FilterAmenity; label: string }[] = [
  { key: 'ac', label: 'Air conditioning' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'kitchenette', label: 'Kitchenette' },
  { key: 'balcony', label: 'Balcony' },
  { key: 'breakfast', label: 'Breakfast included' },
];

export type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'capacity';

export const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price-asc', label: 'Price low to high' },
  { key: 'price-desc', label: 'Price high to low' },
  { key: 'capacity', label: 'Capacity' },
];

export interface RoomFilters {
  minPrice: number | null;
  maxPrice: number | null;
  minGuests: number | null;
  beds: BedType[];
  amenities: FilterAmenity[];
}

export const emptyFilters: RoomFilters = {
  minPrice: null,
  maxPrice: null,
  minGuests: null,
  beds: [],
  amenities: [],
};

export const maxGuests = (room: RoomType) => room.maxAdults + room.maxChildren;

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

export function nightlyPrice(room: RoomType, iso: string): number {
  return isWeekendNight(iso) && room.weekendPriceNgn !== null
    ? room.weekendPriceNgn
    : room.basePriceNgn;
}
