import { cache } from 'react';

import { config } from '@/config';
import { POLICY_SLUGS } from '@/constants/content';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  getAmenityRows,
  getGalleryRows,
  getHotelRow,
  getRoomTypesWithDetails,
  getSocialLinkRows,
  getTestimonialRows,
} from '@/lib/db/queries/content-data';
import {
  listFacilities,
  listFaqs,
  listNearbyAttractions,
  listSitePages,
  listTeamMembers,
} from '@/lib/db/repositories/content.repo';
import { listExtras } from '@/lib/db/repositories/extras.repo';
import type { ExtraItem } from '@/types/checkout.types';
import type {
  AnalyticsSettings,
  ConsentSettings,
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
import type {
  AmenityKey,
  Room,
  SiteConfig,
  Testimonial,
} from '@/types/site.types';

import {
  mapAttraction,
  mapExtra,
  mapFacility,
  mapFaq,
  mapGalleryImage,
  mapHotelSettings,
  mapPolicyPage,
  mapPolicySettings,
  mapPublicSite,
  mapSitePage,
  mapTeamMember,
  mapTestimonial,
} from '../db/mappers/content.mapper';

/**
 * Read-side content API for public pages and metadata. React `cache` wraps the
 * expensive lookups so repeated calls in one request share the same DB reads.
 * Missing hotel settings throw rather than yielding blank content; optional
 * collections are filtered and ordered by their mappers below.
 */

const hotel = cache(async () => (await getHotelRow()) ?? null);
const social = cache(() => getSocialLinkRows());
const roomTypes = cache(() => getRoomTypesWithDetails());
const allRooms = cache(async () => (await roomTypes()).map((r) => r.room));
const sitePages = cache(() => listSitePages());

async function requireHotel() {
  const row = await hotel();
  if (!row) throw new Error(ERROR_MESSAGES.HOTEL_SETTINGS_MISSING);
  return row;
}

/** Hotel identity/contact settings enriched with social links and room count. */
export const getHotelSettings = cache(
  async (): Promise<HotelContentSettings> => {
    const row = await requireHotel();
    const links = await social();
    return mapHotelSettings(row, links, (await roomTypes()).length);
  },
);

/** Public site config derived from hotel settings, social links and the site URL. */
export const getPublicSite = cache(async (): Promise<SiteConfig> => {
  const [row, links, rooms] = await Promise.all([
    requireHotel(),
    social(),
    roomTypes(),
  ]);
  return mapPublicSite(row, links, rooms.length, config.SITE.URL);
});

/**
 * Consent banner settings. Analytics is enabled only when a provider other than
 * `none` has a measurement ID configured. Retention and the privacy link are
 * fixed policy values rather than DB-driven.
 */
export const getConsentSettings = cache(async (): Promise<ConsentSettings> => {
  const row = await requireHotel();
  const analytics = (row.analytics ?? {}) as AnalyticsSettings;
  return {
    enabled: analytics.provider !== 'none' && Boolean(analytics.measurementId),
    privacyPolicyHref: '/policies/privacy',
    retentionDays: 180,
  };
});

/** Loads a published page by slug; returns null when the page is absent or unpublished. */
export async function getPublishedSitePage(
  slug: SitePage['slug'],
): Promise<SitePage | null> {
  const rows = await sitePages();
  const row = rows.find((p) => p.slug === slug && p.status === 'published');
  return row ? mapSitePage(row) : null;
}

/** Loads a published page by slug; throws when the page is absent or unpublished. */
export async function getSitePage(slug: SitePage['slug']): Promise<SitePage> {
  const page = await getPublishedSitePage(slug);
  if (!page) throw new Error(ERROR_MESSAGES.PAGE_NOT_PUBLISHED(slug));
  return page;
}

/** Published about page, or null when it is absent or unpublished. */
export const getAboutPage = async () => getPublishedSitePage('about');

/** First four value cards from the about page; empty when it is unpublished. */
export const getValueCards = async () => {
  const page = await getPublishedSitePage('about');
  return page?.content.valueCards.slice(0, 4) ?? [];
};

/** Compact year/room stats used by highlight sections. */
export const getHighlights = async () => {
  const s = await getHotelSettings();
  return { year: s.yearEstablished, rooms: s.roomCount };
};

/** Published team members only, sorted by explicit display order. */
export const getTeam = async (): Promise<TeamMember[]> => {
  const rows = await listTeamMembers();
  return rows
    .map(mapTeamMember)
    .filter((m) => m.isPublished)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

/** Nearby attractions sorted by explicit display order. */
export const getAttractions = async (): Promise<NearbyAttraction[]> => {
  const rows = await listNearbyAttractions();
  return rows.map(mapAttraction).sort((a, b) => a.sortOrder - b.sortOrder);
};

/** Featured testimonials only, ordered alphabetically by guest name. */
export const getPublishedTestimonials = async (): Promise<Testimonial[]> => {
  const rows = await getTestimonialRows();
  return rows
    .filter((row) => row.isFeatured)
    .map(mapTestimonial)
    .sort((a, b) => (a.guestName > b.guestName ? 1 : -1));
};

/** All facilities sorted by explicit display order. */
export const getFacilities = async (): Promise<Facility[]> => {
  const rows = await listFacilities();
  return rows.map(mapFacility).sort((a, b) => a.sortOrder - b.sortOrder);
};

/**
 * Amenities present in at least half of all rooms, ordered by how many rooms
 * include them. Falls back to the raw key when no label row exists.
 */
export const getRoomAmenities = async (): Promise<
  { key: AmenityKey; label: string }[]
> => {
  const rooms = await allRooms();
  const amenityRows = await getAmenityRows();
  const labels = new Map(amenityRows.map((a) => [a.key, a.label]));
  const counts = new Map<string, number>();
  for (const room of rooms)
    for (const amenity of room.amenities)
      counts.set(amenity, (counts.get(amenity) ?? 0) + 1);
  return [...counts]
    .filter(([, n]) => rooms.length > 0 && n >= rooms.length / 2)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => ({
      key: key as AmenityKey,
      label: labels.get(key) ?? key,
    }));
};

/** Checkout extras sorted alphabetically by name. */
export const getExtras = async (): Promise<ExtraItem[]> => {
  const rows = await listExtras();
  return rows.map(mapExtra).sort((a, b) => a.name.localeCompare(b.name));
};

/** Active gallery images only, sorted by explicit display order. */
export const getGalleryImages = async (): Promise<GalleryImageRecord[]> => {
  const rows = await getGalleryRows();
  return rows
    .filter((row) => row.isActive)
    .map(mapGalleryImage)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

/** Minimal room id/name pairs for selects and filters. */
export const getRoomTypeOptions = async () => {
  const rooms = await allRooms();
  return rooms.map((r) => ({ id: r.id, name: r.name }));
};

/** FAQs sorted by explicit display order. */
export const getFaqs = async (): Promise<Faq[]> => {
  const rows = await listFaqs();
  return rows.map(mapFaq).sort((a, b) => a.sortOrder - b.sortOrder);
};

/** Social links from hotel settings. */
export const getSocialLinks = async (): Promise<SocialLink[]> =>
  (await getHotelSettings()).socialLinks;

/** Facilities usable for events, excluding the catch-all `other` kind. */
export const getEventFacilities = async (): Promise<Facility[]> =>
  (await getFacilities()).filter((x) => x.kind !== 'other');

/** Up to three attractions reduced to name and distance copy for teasers. */
export const getLandmarks = async () => {
  const attractions = await getAttractions();
  return attractions
    .slice(0, 3)
    .map((a) => ({ name: a.name, distance: a.distanceNote }));
};

/** Enquiry form copy, currently the advertised response time. */
export const getFormSettings = async () => {
  const settings = await getHotelSettings();
  return { responseHours: settings.enquiryResponseHours };
};

/**
 * Published policy pages, restricted to the known `POLICY_SLUGS` and ordered by
 * that list rather than by arbitrary DB order.
 */
export const getPolicyPages = async (): Promise<PolicyPage[]> => {
  const rows = await sitePages();
  const data = POLICY_SLUGS.map((slug) =>
    rows.find((row) => row.slug === slug && row.template === 'policy'),
  )
    .map((row) => (row ? mapPolicyPage(row) : null))
    .filter((page): page is PolicyPage => Boolean(page))
    .filter((page) => page.isPublished)
    .sort(
      (a, b) => POLICY_SLUGS.indexOf(a.slug) - POLICY_SLUGS.indexOf(b.slug),
    );
  return data;
};

/** Returns the published policy or `null` (unlike `getSitePage`, which throws). */
export const getPolicyPage = async (
  slug: PolicySlug,
): Promise<PolicyPage | null> => {
  const pages = await getPolicyPages();
  return pages.find((p) => p.slug === slug) ?? null;
};

export type PolicyPageState =
  | { status: 'published'; page: PolicyPage }
  | { status: 'unpublished' }
  | { status: 'missing' };

/** Distinguishes a draft policy from one that has never been seeded. */
export const getPolicyPageState = async (
  slug: PolicySlug,
): Promise<PolicyPageState> => {
  const rows = await sitePages();
  const row = rows.find((p) => p.slug === slug && p.template === 'policy');
  if (!row) return { status: 'missing' };
  const page = mapPolicyPage(row);
  if (!page || !page.isPublished) return { status: 'unpublished' };
  return { status: 'published', page };
};

/** Policy-related settings derived from the hotel row. */
export const getPolicySettings = cache(async (): Promise<PolicySettings> => {
  const row = await requireHotel();
  return mapPolicySettings(row);
});

/**
 * Up to three popular rooms mapped to the homepage feature shape. The rooms
 * module is imported lazily to avoid a circular dependency at load time.
 */
export const getFeaturedRooms = async (): Promise<Room[]> => {
  const { toFeatureRoom } = await import('../rooms');
  return (await allRooms())
    .filter((room) => room.popular)
    .slice(0, 3)
    .map(toFeatureRoom);
};

/** First six room amenities, for compact homepage strips. */
export const getFeaturedAmenities = async (): Promise<
  { key: AmenityKey; label: string }[]
> => (await getRoomAmenities()).slice(0, 6);

/** First six active gallery images, for homepage previews. */
export const getGalleryPreview = async (): Promise<GalleryImageRecord[]> =>
  (await getGalleryImages()).slice(0, 6);

/** First six featured testimonials, for homepage previews. */
export const getHomeTestimonials = async (): Promise<Testimonial[]> =>
  (await getPublishedTestimonials()).slice(0, 6);
