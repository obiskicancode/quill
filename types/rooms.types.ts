import type { ISODate } from '@/types/dates.types';
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

export type FilterAmenity =
  'ac' | 'wifi' | 'kitchenette' | 'balcony' | 'breakfast';

export type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'capacity';

export interface RoomFilters {
  minPrice: number | null;
  maxPrice: number | null;
  minGuests: number | null;
  beds: BedType[];
  amenities: FilterAmenity[];
}

/** Everything the page needs lives in the URL, so views can be shared, bookmarked and carried into detail and checkout links. */
export interface RoomQuery {
  checkIn: ISODate | null;
  checkOut: ISODate | null;
  adults: number;
  children: number;
  sort: SortKey;
  filters: RoomFilters;
  count: number | null;
}

export interface RoomGalleryImage {
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

export interface SeasonalRateRule {
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
  gallery: RoomGalleryImage[];
  testimonials: RoomTestimonial[];
}

export interface HotelPricingSettings {
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
  rateRules?: SeasonalRateRule[];
}

export interface StayParams {
  checkIn: ISODate;
  checkOut: ISODate;
  adults: number;
  children: number;
}

export interface DateSuggestion {
  checkIn: ISODate;
  checkOut: ISODate;
  totalNgn: number | null;
}

export type RoomAvailability =
  | {
      status: 'available';
      remaining: number;
      nights: number;
      totalNgn: number;
      averageNgn: number;
      weekendNights: number;
    }
  | { status: 'sold-out'; suggestions: DateSuggestion[] }
  | { status: 'min-stay'; minNights: number; suggestedCheckOut: ISODate }
  | { status: 'over-capacity'; maxAdults: number; maxChildren: number }
  | { status: 'on-request' };

export type AvailabilityMap = Record<string, RoomAvailability>;
