import type { ImageAsset, SocialPlatform } from '@/types/site.types';

/** Typed shapes for the content pages. They mirror the admin's data fields. Money is integer kobo. */

/** An inline link the renderer is allowed to render (see lib/content/rich.ts for the href allow-list). */
export interface RichLink {
  label: string;
  href: string;
}

/**
 * Admin rich text. The original p/h3/ul shapes are unchanged, so existing pages keep working;
 * policy pages add h2, ol and tables, plus optional inline links on a paragraph.
 */
export type RichBlock =
  | { type: 'p'; text: string; links?: RichLink[] }
  | { type: 'h2' | 'h3'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'table'; caption?: string; head: string[]; rows: string[][] };

export const ENQUIRY_TOPICS = [
  'general',
  'group_booking',
  'event_conference',
  'corporate_account',
  'complaint_feedback',
  'booking_enquiry',
] as const;
export type EnquiryTopic = (typeof ENQUIRY_TOPICS)[number];

/** The topics shown in the contact form's dropdown. The booking enquiry form uses its own topic. */
export const CONTACT_TOPICS = ENQUIRY_TOPICS.filter(
  (t): t is Exclude<EnquiryTopic, 'booking_enquiry'> => t !== 'booking_enquiry',
);

export interface PublicPhone {
  label: string;
  display: string;
  tel: string;
}

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
}

/** Hotel settings used across the content pages. Values in [brackets] are placeholders. */
export interface HotelSettings {
  displayName: string;
  yearEstablished: number | null;
  roomCount: number | null;
  address: {
    line1: string;
    area: string;
    city: string;
    state: string;
    country: string;
  };
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  googleMapsEmbedUrl: string | null;
  directionsText: string | null;
  nearestAirportNote: string | null;
  publicPhones: PublicPhone[];
  whatsappNumber: string;
  whatsappPrefillMessage: string;
  publicEmail: string | null;
  contactFormRecipient: string;
  receptionHours: string | null;
  googleReviewsUrl: string | null;
  enquiryResponseHours: number;
  socialLinks: SocialLink[];
  analytics: AnalyticsSettings;
}

/** Analytics and marketing tags. Nothing loads until a guest consents and an ID is configured. */
export interface AnalyticsSettings {
  provider: 'none' | 'ga4' | 'plausible' | 'meta_pixel';
  /** Google measurement ID, Plausible domain or Meta pixel ID. Ignored while provider is "none". */
  measurementId: string | null;
  /** Set true only when the hotel also runs marketing tags, so the consent banner can offer it. */
  marketingEnabled: boolean;
}

/** Consent storage settings, read by the cookie banner. */
export interface ConsentSettings {
  /** The banner only appears when something optional is actually configured. */
  enabled: boolean;
  privacyPolicyHref: string;
  /** Days the guest's choice is remembered before they are asked again. */
  retentionDays: number;
}

export type ValueIcon =
  'bed' | 'shield' | 'power' | 'heart' | 'clock' | 'map' | 'users' | 'sparkles';

export interface ValueCard {
  icon: ValueIcon;
  title: string;
  text: string;
}

/** site_pages: one row per page. */
export interface SitePage {
  slug: 'about' | 'amenities' | 'gallery' | 'contact';
  title: string;
  intro: string;
  heroImage: ImageAsset;
  body: RichBlock[];
  content: {
    valueCards: ValueCard[];
    images: ImageAsset[];
    surroundingsText?: string;
  };
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: ImageAsset | null;
}

export const POLICY_SLUGS = [
  'terms',
  'privacy',
  'cancellation-policy',
  'house-rules',
] as const;
export type PolicySlug = (typeof POLICY_SLUGS)[number];

/** site_pages rows that are policies. Carries a summary card and an updated_at date. */
export interface PolicyPage {
  slug: PolicySlug;
  title: string;
  summary: string;
  body: RichBlock[];
  /** ISO date string (YYYY-MM-DD). Shown as "Last updated". */
  updatedAt: string;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
}

export type CancellationPolicyType =
  'flexible' | 'moderate' | 'non_refundable' | 'custom';
export type SmokingPolicy = 'not_allowed' | 'outside_only' | 'allowed';

/** Structured policy facts, merged into the cancellation and house-rules pages. */
export interface PolicySettings {
  cancellation: {
    policyType: CancellationPolicyType;
    /** null when there is no free cancellation. */
    freeCancellationHours: number | null;
    /** Percentage refunded once the free window has passed. */
    refundPercentAfterWindow: number;
    noShowPolicy: string;
    /** Working days to the refund landing on the guest's card. null hides the row. */
    refundTimelineDays: number | null;
  };
  houseRules: {
    checkInTime: string;
    checkOutTime: string;
    petsAllowed: boolean;
    petsNote: string;
    smokingPolicy: SmokingPolicy;
    smokingNote: string;
    idRequiredAtCheckin: boolean;
    childrenPolicy: string;
    quietHours: string | null;
    visitorsNote: string | null;
    damagesNote: string | null;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: ImageAsset | null;
  sortOrder: number;
  isPublished: boolean;
}

export interface NearbyAttraction {
  id: string;
  name: string;
  description: string;
  distanceNote: string;
  sortOrder: number;
}

export type FacilityKind = 'conference' | 'event' | 'other';

export interface Facility {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: ImageAsset | null;
  openingHours: string | null;
  pricing: 'free' | 'paid';
  priceNote: string | null;
  capacity: string | null;
  layouts: string[];
  ctaLabel: string | null;
  ctaTopic: EnquiryTopic | null;
  kind: FacilityKind;
  sortOrder: number;
}

export const GALLERY_CATEGORIES = [
  'rooms',
  'facilities',
  'exterior',
  'dining',
  'events',
  'surroundings',
] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export interface GalleryImageRecord {
  id: string;
  url: string;
  thumbnailUrl: string;
  altText: string;
  caption: string;
  category: GalleryCategory;
  roomTypeId: string | null;
  facilityId: string | null;
  width: number;
  height: number;
  sortOrder: number;
  isPublished: boolean;
  /** Dominant colour, shown while the photo loads. */
  color: string | null;
  /** Optional tiny blurred preview (a base64 data URL). */
  blurDataURL: string | null;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}
