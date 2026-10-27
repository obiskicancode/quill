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

const hotel = cache(async () => (await getHotelRow()) ?? null);
const social = cache(() => getSocialLinkRows());
const roomTypes = cache(() => getRoomTypesWithDetails());
const allRooms = cache(async () => (await roomTypes()).map((r) => r.room));

async function requireHotel() {
  const row = await hotel();
  if (!row) throw new Error(ERROR_MESSAGES.HOTEL_SETTINGS_MISSING);
  return row;
}

export const getHotelSettings = cache(
  async (): Promise<HotelContentSettings> => {
    const row = await requireHotel();
    const links = await social();
    return mapHotelSettings(row, links, (await roomTypes()).length);
  },
);

export const getPublicSite = cache(async (): Promise<SiteConfig> => {
  const [row, links, rooms] = await Promise.all([
    requireHotel(),
    social(),
    roomTypes(),
  ]);
  return mapPublicSite(row, links, rooms.length, config.SITE.URL);
});

export const getConsentSettings = cache(async (): Promise<ConsentSettings> => {
  const row = await requireHotel();
  const analytics = (row.analytics ?? {}) as AnalyticsSettings;
  return {
    enabled: analytics.provider !== 'none' && Boolean(analytics.measurementId),
    privacyPolicyHref: '/policies/privacy',
    retentionDays: 180,
  };
});

export async function getSitePage(slug: SitePage['slug']): Promise<SitePage> {
  const pages = await listSitePages();
  const row = pages.find((p) => p.slug === slug && p.status === 'published');
  if (!row) throw new Error(ERROR_MESSAGES.PAGE_NOT_PUBLISHED(slug));
  return mapSitePage(row);
}

export const getAboutPage = async () => getSitePage('about');

export const getValueCards = async () =>
  (await getSitePage('about')).content.valueCards.slice(0, 4);

export const getHighlights = async () => {
  const s = await getHotelSettings();
  return { year: s.yearEstablished, rooms: s.roomCount };
};

export const getTeam = async (): Promise<TeamMember[]> => {
  const rows = await listTeamMembers();
  return rows
    .map(mapTeamMember)
    .filter((m) => m.isPublished)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getAttractions = async (): Promise<NearbyAttraction[]> => {
  const rows = await listNearbyAttractions();
  return rows.map(mapAttraction).sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getPublishedTestimonials = async (): Promise<Testimonial[]> => {
  const rows = await getTestimonialRows();
  return rows
    .filter((row) => row.isFeatured)
    .map(mapTestimonial)
    .sort((a, b) => (a.guestName > b.guestName ? 1 : -1));
};

export const getFacilities = async (): Promise<Facility[]> => {
  const rows = await listFacilities();
  return rows.map(mapFacility).sort((a, b) => a.sortOrder - b.sortOrder);
};

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

export const getExtras = async (): Promise<ExtraItem[]> => {
  const rows = await listExtras();
  return rows.map(mapExtra).sort((a, b) => a.name.localeCompare(b.name));
};

export const getGalleryImages = async (): Promise<GalleryImageRecord[]> => {
  const rows = await getGalleryRows();
  return rows
    .filter((row) => row.isActive)
    .map(mapGalleryImage)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getRoomTypeOptions = async () => {
  const rooms = await allRooms();
  return rooms.map((r) => ({ id: r.id, name: r.name }));
};

export const getFaqs = async (): Promise<Faq[]> => {
  const rows = await listFaqs();
  return rows.map(mapFaq).sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getSocialLinks = async (): Promise<SocialLink[]> =>
  (await getHotelSettings()).socialLinks;

export const getEventFacilities = async (): Promise<Facility[]> =>
  (await getFacilities()).filter((x) => x.kind !== 'other');

export const getContactInfo = async () => getHotelSettings();

export const getLocationInfo = async () => getHotelSettings();

export const getLandmarks = async () => {
  const attractions = await getAttractions();
  return attractions
    .slice(0, 3)
    .map((a) => ({ name: a.name, distance: a.distanceNote }));
};

export const getFormSettings = async () => {
  const settings = await getHotelSettings();
  return { responseHours: settings.enquiryResponseHours };
};

export const getPolicyPages = async (): Promise<PolicyPage[]> => {
  const rows = await listSitePages();
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

export const getPolicyPage = async (
  slug: PolicySlug,
): Promise<PolicyPage | null> => {
  const pages = await getPolicyPages();
  return pages.find((p) => p.slug === slug) ?? null;
};

export const getPolicySettings = cache(async (): Promise<PolicySettings> => {
  const row = await requireHotel();
  return mapPolicySettings(row);
});

export const getFeaturedRooms = async (): Promise<Room[]> => {
  const { toFeatureRoom } = await import('../rooms');
  return (await allRooms())
    .filter((room) => room.popular)
    .slice(0, 3)
    .map(toFeatureRoom);
};

export const getFeaturedAmenities = async (): Promise<
  { key: AmenityKey; label: string }[]
> => (await getRoomAmenities()).slice(0, 6);

export const getGalleryPreview = async (): Promise<GalleryImageRecord[]> =>
  (await getGalleryImages()).slice(0, 6);

export const getHomeTestimonials = async (): Promise<Testimonial[]> =>
  (await getPublishedTestimonials()).slice(0, 6);
