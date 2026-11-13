import type * as schema from '@/db/schema';
import type {
  NearbyAttraction as DbAttraction,
  BankAccount as DbBankAccount,
  Extra as DbExtra,
  Facility as DbFacility,
  Faq as DbFaq,
  GalleryImage as DbGalleryImage,
  HotelSettings as DbHotelSettings,
  SitePage as DbSitePage,
  SocialLink as DbSocialLink,
  TeamMember as DbTeamMember,
  Testimonial as DbTestimonial,
} from '@/db/types';
import type { ExtraItem } from '@/types/checkout.types';
import type {
  AnalyticsSettings,
  Facility,
  Faq,
  GalleryImageRecord,
  HotelContentSettings,
  NearbyAttraction,
  PolicyPage,
  PolicySettings,
  PolicySlug,
  SitePage,
  SocialLink,
  TeamMember,
} from '@/types/content.types';
import type { ImageAsset, SiteConfig, Testimonial } from '@/types/site.types';

/**
 * Maps database content rows into the public content and site types. Mappers
 * are pure and substitute defaults for nullable columns or legacy snapshots.
 */

type PageContent = {
  page?: Record<string, unknown>;
  body?: unknown;
};

const image = (
  src: string | null | undefined,
  alt: string | null | undefined,
): ImageAsset | null => (src ? { src, alt: alt ?? '' } : null);

/**
 * Builds hotel content settings, normalizing phone labels, address parts, and
 * analytics defaults. `roomCount` is supplied by the caller.
 */
export function mapHotelSettings(
  row: DbHotelSettings,
  social: DbSocialLink[],
  roomCount: number,
): HotelContentSettings {
  const analytics = (row.analytics as AnalyticsSettings | null) ?? {
    provider: 'none',
    measurementId: null,
    marketingEnabled: false,
  };
  const phones = row.publicPhones.map((display, index) => ({
    label: index === 0 ? 'Reception' : `Phone ${index + 1}`,
    display,
    tel: display.replace(/[^\d+]/g, ''),
  }));
  const parts = row.address.split(',').map((s) => s.trim());
  return {
    displayName: row.displayName,
    yearEstablished: row.yearEstablished ?? null,
    roomCount,
    address: {
      line1: parts[0] ?? row.address,
      area: parts[1] ?? '',
      city: row.city,
      state: row.state ?? '',
      country: row.country === 'NG' ? 'Nigeria' : row.country,
    },
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    googleMapsUrl: row.googleMapsUrl,
    googleMapsEmbedUrl: row.googleMapsEmbedUrl,
    directionsText: row.directionsText,
    nearestAirportNote: row.nearestAirportNote,
    publicPhones: phones,
    whatsappNumber: row.whatsappNumber ?? '',
    whatsappPrefillMessage:
      row.whatsappPrefillMessage ?? `Hello ${row.displayName}`,
    publicEmail: row.publicEmail,
    contactFormRecipient: row.contactFormRecipient ?? row.publicEmail ?? '',
    receptionHours: row.receptionHours,
    googleReviewsUrl: row.googleReviewsUrl,
    enquiryResponseHours: row.enquiryResponseHours,
    socialLinks: social.map(mapSocialLink),
    analytics,
  };
}

const DEFAULT_NAV = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Rooms', href: '/rooms' },
  { label: 'Amenities', href: '/amenities' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Contact', href: '/contact' },
];

const DEFAULT_POLICIES = [
  { label: 'Terms', href: '/policies/terms' },
  { label: 'Privacy', href: '/policies/privacy' },
  { label: 'Cancellation', href: '/policies/cancellation-policy' },
  { label: 'House rules', href: '/policies/house-rules' },
];

/**
 * Builds the public site config from the database. Normalized hotel_settings
 * columns take priority over the older site_config snapshot.
 */
export function mapPublicSite(
  row: DbHotelSettings,
  social: DbSocialLink[],
  roomCount: number,
  url: string,
): SiteConfig {
  const stored = (row.siteConfig ?? {}) as Partial<SiteConfig>;
  const hotel = mapHotelSettings(row, social, roomCount);
  const phone = hotel.publicPhones[0];
  const addressLines = [
    hotel.address.line1,
    [hotel.address.area, hotel.address.city, hotel.address.state]
      .filter(Boolean)
      .join(', '),
    hotel.address.country,
  ].filter(Boolean);
  const mapQuery =
    stored.address?.mapQuery ??
    (addressLines.length ? addressLines.join(', ') : null);
  const heroImage = row.heroImageUrl
    ? {
        src: row.heroImageUrl,
        alt: row.heroImageAlt ?? stored.hero?.image?.alt ?? '',
      }
    : (stored.hero?.image ?? { src: '', alt: '' });
  const logo = row.logoUrl
    ? {
        src: row.logoUrl,
        alt: row.logoAlt ?? row.displayName,
        width: stored.logo?.width ?? 160,
        height: stored.logo?.height ?? 48,
      }
    : (stored.logo ?? null);

  return {
    name: row.displayName,
    shortName: stored.shortName?.trim() || row.displayName,
    description: row.description ?? stored.description ?? '',
    url,
    logo,
    bookingHref: stored.bookingHref?.trim() || '/checkout',
    nav: stored.nav?.length ? stored.nav : DEFAULT_NAV,
    contact: {
      phoneDisplay: phone?.display ?? '',
      phoneTel: phone?.tel ?? '',
      whatsappNumber: row.whatsappNumber ?? '',
      whatsappMessage: row.whatsappPrefillMessage ?? '',
      email: row.publicEmail ?? '',
    },
    address: {
      lines: addressLines,
      mapQuery,
      mapEmbedUrl: row.googleMapsEmbedUrl,
      directionsUrl: row.googleMapsUrl,
      addressUrl: row.googleMapsUrl,
    },
    reception: row.receptionHours ?? '',
    landmarks: stored.landmarks ?? [],
    social: hotel.socialLinks.map((link) => ({
      label: link.label,
      href: link.url,
      platform: link.platform,
    })),
    googleReviewsUrl: row.googleReviewsUrl,
    reviews: stored.reviews ?? { rating: null, count: null },
    policies: stored.policies?.length ? stored.policies : DEFAULT_POLICIES,
    trust: stored.trust ?? [],
    hero: {
      headline: row.heroTitle ?? stored.hero?.headline ?? '',
      subheadline: row.heroSubtitle ?? stored.hero?.subheadline ?? '',
      image: heroImage,
      video: stored.hero?.video ?? null,
    },
    intro: stored.intro ?? {
      heading: '',
      body: [],
      image: { src: '', alt: '' },
      learnMoreHref: '/about',
    },
    cta: stored.cta ?? { heading: '', text: '' },
  };
}

/** Maps a social link row, defaulting the label to the platform name. */
export function mapSocialLink(row: DbSocialLink): SocialLink {
  return {
    id: row.id,
    platform: row.platform as SocialLink['platform'],
    label: row.label ?? row.platform,
    url: row.url,
  };
}

/**
 * Maps a site page row, falling back to the embedded `content.page` snapshot
 * and empty defaults when normalized columns are absent.
 */
export function mapSitePage(row: DbSitePage): SitePage {
  const content = (row.content ?? {}) as PageContent;
  const page = (content.page ?? {}) as Record<string, unknown>;
  return {
    slug: row.slug as SitePage['slug'],
    title: row.title,
    intro: row.intro ?? (page.intro as string) ?? '',
    heroImage: image(
      row.heroImageUrl ?? (page.heroImage as ImageAsset | undefined)?.src,
      row.heroImageAlt ?? (page.heroImage as ImageAsset | undefined)?.alt,
    ) ?? { src: '', alt: '' },
    body: (content.body ?? page.body ?? []) as SitePage['body'],
    content: (page.content ?? {
      valueCards: [],
      images: [],
    }) as SitePage['content'],
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    ogImage: image(
      row.ogImageUrl,
      (page.ogImage as ImageAsset | undefined)?.alt,
    ),
  };
}

/**
 * Maps a policy page, returning null for rows whose template is not `policy`.
 */
export function mapPolicyPage(row: DbSitePage): PolicyPage | null {
  if (row.template !== 'policy') return null;
  const content = (row.content ?? {}) as PageContent;
  const page = (content.page ?? {}) as Record<string, unknown>;
  return {
    slug: row.slug as PolicySlug,
    title: row.title,
    summary: row.intro ?? (page.summary as string) ?? '',
    body: (content.body ?? page.body ?? []) as PolicyPage['body'],
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
    isPublished: row.status === 'published',
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
  };
}

/**
 * Maps a facility row; unrecognized pricing and kind values fall back to
 * `free` and `other`.
 */
export function mapFacility(row: DbFacility): Facility {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    image: image(row.imageUrl, row.imageAlt),
    openingHours: row.openingHours,
    pricing: row.pricing === 'paid' ? 'paid' : 'free',
    priceNote: row.priceNote,
    capacity: row.capacity,
    layouts: row.layouts,
    ctaLabel: row.ctaLabel,
    ctaTopic: row.ctaTopic as Facility['ctaTopic'],
    kind: (row.kind === 'conference' || row.kind === 'event'
      ? row.kind
      : 'other') as Facility['kind'],
    sortOrder: row.sortOrder,
  };
}

/**
 * Maps a gallery image, falling back to the full image URL for the thumbnail
 * and to default dimensions when they are missing.
 */
export function mapGalleryImage(row: DbGalleryImage): GalleryImageRecord {
  return {
    id: row.id,
    url: row.imageUrl,
    thumbnailUrl: row.thumbnailUrl ?? row.imageUrl,
    altText: row.altText,
    caption: row.caption ?? row.title ?? '',
    category: row.category as GalleryImageRecord['category'],
    roomTypeId: row.roomTypeId,
    facilityId: row.facilityId,
    width: row.width ?? 1600,
    height: row.height ?? 1067,
    sortOrder: row.sortOrder,
    isPublished: row.isActive,
    color: row.color,
    blurDataURL: row.blurDataUrl,
  };
}

/** Maps a testimonial; a missing rating or photo is omitted. */
export function mapTestimonial(row: DbTestimonial): Testimonial {
  return {
    id: row.id,
    quote: row.quote,
    guestName: row.guestName,
    stayType: row.stayType ?? '',
    rating: row.rating ?? undefined,
    photo: image(row.imageUrl, row.imageAlt) ?? undefined,
  };
}

/** Maps an FAQ row. */
export function mapFaq(row: DbFaq): Faq {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
  };
}

/** Maps a team member, defaulting optional text fields to empty strings. */
export function mapTeamMember(row: DbTeamMember): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role ?? '',
    bio: row.bio ?? '',
    photo: image(row.imageUrl, row.imageAlt),
    sortOrder: row.sortOrder,
    isPublished: row.isActive,
  };
}

/** Maps a nearby attraction; the `distance` column becomes `distanceNote`. */
export function mapAttraction(row: DbAttraction): NearbyAttraction {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    distanceNote: row.distance ?? '',
    sortOrder: row.sortOrder,
  };
}

/**
 * Maps an extra row; the public id is the slug and prices stay in minor units.
 */
export function mapExtra(row: DbExtra): ExtraItem {
  return {
    id: row.slug,
    name: row.name,
    description: row.description ?? '',
    unit: row.pricingUnit,
    priceMinor: row.priceMinor,
    maxQuantity: row.maxQuantity,
  };
}

/** Maps a bank account row to its public transfer details. */
export function mapBankAccount(row: DbBankAccount) {
  return {
    bankName: row.bankName,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
  };
}

/**
 * Returns stored policy settings when present; otherwise derives them from the
 * legacy hotel_settings columns.
 */
export function mapPolicySettings(row: DbHotelSettings): PolicySettings {
  const stored = (row.policySettings ?? null) as PolicySettings | null;
  if (stored) return stored;
  const after = (row.afterDeadlineRule ?? {}) as {
    kind?: string;
    value?: number;
    percent?: number;
  };
  return {
    cancellation: {
      policyType:
        row.cancellationPolicyType === 'non_refundable'
          ? 'non_refundable'
          : row.cancellationPolicyType === 'custom'
            ? 'custom'
            : row.cancellationPolicyType === 'strict'
              ? 'moderate'
              : 'flexible',
      freeCancellationHours: row.freeCancellationHours,
      refundPercentAfterWindow:
        after.percent ??
        after.value ??
        Math.round(row.refundBpsAfterWindow / 100),
      noShowPolicy: 'No-show bookings may be charged in full.',
      refundTimelineDays: 7,
    },
    houseRules: {
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      petsAllowed: row.petsAllowed,
      petsNote: row.petsPolicyText ?? '',
      smokingPolicy:
        row.smokingPolicy === 'allowed'
          ? 'allowed'
          : row.smokingPolicy === 'outside_only'
            ? 'outside_only'
            : 'not_allowed',
      smokingNote: '',
      idRequiredAtCheckin: row.idRequiredAtCheckIn,
      childrenPolicy: '',
      quietHours: null,
      visitorsNote: null,
      damagesNote: null,
    },
  };
}

/** Type of the Drizzle schema namespace. */
export type DbSchema = typeof schema;
