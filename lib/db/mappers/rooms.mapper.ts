import type {
  Amenity as DbAmenity,
  GalleryImage as DbGalleryImage,
  HotelSettings as DbHotelSettings,
  RateRule as DbRateRule,
  RoomType as DbRoomType,
  Testimonial as DbTestimonial,
} from '@/db/types';
import type {
  BedType,
  HotelPricingSettings,
  RoomAmenityKey,
  RoomDetail,
  RoomTestimonial,
  RoomType,
  SeasonalRateRule,
} from '@/types/rooms.types';
import type { AmenityKey, ImageAsset } from '@/types/site.types';

/**
 * Maps room, amenity, gallery, and rate-rule rows into the public room types.
 * Falls back to cover images and derived bed types when richer data is absent.
 */

function bedType(label: string | null): BedType {
  const value = (label ?? '').toLowerCase();
  if (value.includes('twin') || value.includes('single')) return 'twin';
  if (value.includes('double')) return 'double';
  if (value.includes('king')) return 'king';
  return 'queen';
}

const toImage = (row: DbGalleryImage): ImageAsset => ({
  src: row.imageUrl,
  alt: row.altText,
});

/** Room relations keyed by room type id: amenities, images, and testimonials. */
export interface RoomRelations {
  amenities: Map<string, DbAmenity[]>;
  images: Map<string, DbGalleryImage[]>;
  testimonials: Map<string, DbTestimonial[]>;
}

/**
 * Maps a room type with sorted images, a derived bed type, and a cover-image
 * fallback when no gallery images are linked.
 */
export function mapRoomType(row: DbRoomType, rel: RoomRelations): RoomType {
  const images = (rel.images.get(row.id) ?? []).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const amenities = (rel.amenities.get(row.id) ?? []).map(
    (a) => a.key as RoomAmenityKey,
  );
  const fee = row.extraBedAvailable
    ? (row.extraAdultPriceMinor ?? 0) / 100
    : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? row.shortDescription ?? '',
    bedConfig: row.bedConfig ?? '',
    bedType: bedType(row.bedConfig),
    sizeSqm: row.sizeSqm ? Number(row.sizeSqm) : 0,
    maxAdults: row.maxAdults,
    maxChildren: row.maxChildren,
    extraBed: { available: row.extraBedAvailable, feeNgn: fee },
    basePriceNgn: Math.round(row.basePriceMinor / 100),
    weekendPriceNgn:
      row.weekendPriceMinor === null
        ? null
        : Math.round(row.weekendPriceMinor / 100),
    showPrice: row.showPrice,
    breakfastIncluded: row.breakfastIncluded,
    taxesIncluded: row.taxesIncluded,
    minStayNights: row.minStayNights,
    popular: row.isFeatured,
    amenities,
    images: images.length
      ? images.map(toImage)
      : row.coverImageUrl
        ? [{ src: row.coverImageUrl, alt: row.coverImageAlt ?? row.name }]
        : [],
  };
}

/**
 * Extends the public room type with admin/booking fields, a gallery, and
 * testimonials; gallery images are sorted by display order.
 */
export function mapRoomDetail(row: DbRoomType, rel: RoomRelations): RoomDetail {
  const room = mapRoomType(row, rel);
  const images = (rel.images.get(row.id) ?? []).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  return {
    ...room,
    active: row.isActive,
    basePriceMinor: row.basePriceMinor,
    weekendPriceMinor: row.weekendPriceMinor,
    extraBedPriceMinor: row.extraBedAvailable
      ? (row.extraAdultPriceMinor ?? 0)
      : null,
    viewNotes: row.viewNotes ?? '',
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    gallery: images.map((image) => ({
      src: image.imageUrl,
      alt: image.altText,
      caption: image.caption ?? image.title ?? '',
    })),
    testimonials: (rel.testimonials.get(row.id) ?? []).map(
      (t): RoomTestimonial => ({
        id: t.id,
        quote: t.quote,
        guestName: t.guestName,
        stayType: t.stayType ?? '',
        rating: t.rating ?? 0,
      }),
    ),
  };
}

/**
 * Maps a rate rule; only percentage markups produce an uplift, other
 * adjustment types map to 0.
 */
export function mapRateRule(row: DbRateRule): SeasonalRateRule {
  return {
    label: row.name,
    start: row.startDate.slice(5),
    end: row.endDate.slice(5),
    upliftPercent:
      row.adjustmentType === 'percent_markup'
        ? row.adjustmentValue
        : row.adjustmentType === 'amount_markup'
          ? 0
          : 0,
  };
}

/**
 * Maps hotel pricing settings, converting basis points to percentages and
 * passing seasonal rate rules through unchanged.
 */
export function mapRoomHotelSettings(
  row: DbHotelSettings,
  rules: SeasonalRateRule[],
): HotelPricingSettings {
  return {
    timeZone: row.timezone,
    checkInTime: row.checkInTime,
    checkOutTime: row.checkOutTime,
    taxPercent: row.taxBps / 100,
    serviceChargePercent: row.serviceChargeBps / 100,
    minNights: row.minNights,
    maxNights: row.maxNights,
    bookingWindowDays: row.maxAdvanceBookingDays,
    sameDayCutoff: row.sameDayCutoff,
    freeCancellationHours: row.freeCancellationHours,
    cancellationSummary:
      'Cancellation terms are shown on your booking confirmation.',
    childrenPolicy: row.childrenAllowed
      ? 'Children are welcome.'
      : 'Children cannot be accommodated.',
    petsPolicy: row.petsPolicyText ?? '',
    smokingPolicy:
      row.smokingPolicy === 'allowed'
        ? 'Smoking is allowed.'
        : 'Smoking is not allowed in rooms.',
    idPolicy: row.idRequirementText ?? '',
    bestPriceDirect: true,
    rateRules: rules,
  };
}

/** Re-exported amenity key type for consumers of the room mapper. */
export type { AmenityKey };
