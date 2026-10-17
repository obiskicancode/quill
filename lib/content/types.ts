import type { ImageAsset } from '../types'

/** Typed shapes for the content pages. They mirror the admin's data fields. Money is integer kobo. */

export type RichBlock = { type: 'p'; text: string } | { type: 'h3'; text: string } | { type: 'ul'; items: string[] }

export const ENQUIRY_TOPICS = ['general', 'group_booking', 'event_conference', 'corporate_account', 'complaint_feedback'] as const
export type EnquiryTopic = (typeof ENQUIRY_TOPICS)[number]

export interface PublicPhone {
  label: string
  display: string
  tel: string
}

export interface SocialLink {
  id: string
  platform: 'instagram' | 'facebook' | 'x' | 'youtube' | 'linkedin' | 'tiktok' | 'other'
  label: string
  url: string
}

/** Hotel settings used across the content pages. Values in [brackets] are placeholders. */
export interface HotelSettings {
  displayName: string
  yearEstablished: number | null
  roomCount: number | null
  address: { line1: string; area: string; city: string; state: string; country: string }
  latitude: number | null
  longitude: number | null
  googleMapsUrl: string | null
  googleMapsEmbedUrl: string | null
  directionsText: string | null
  nearestAirportNote: string | null
  publicPhones: PublicPhone[]
  whatsappNumber: string
  whatsappPrefillMessage: string
  publicEmail: string | null
  contactFormRecipient: string
  receptionHours: string | null
  googleReviewsUrl: string | null
  enquiryResponseHours: number
  socialLinks: SocialLink[]
}

export type ValueIcon = 'bed' | 'shield' | 'power' | 'heart' | 'clock' | 'map' | 'users' | 'sparkles'

export interface ValueCard {
  icon: ValueIcon
  title: string
  text: string
}

/** site_pages: one row per page. */
export interface SitePage {
  slug: 'about' | 'amenities' | 'gallery' | 'contact'
  title: string
  intro: string
  heroImage: ImageAsset
  body: RichBlock[]
  content: { valueCards: ValueCard[]; images: ImageAsset[]; surroundingsText?: string }
  metaTitle: string | null
  metaDescription: string | null
  ogImage: ImageAsset | null
}

export interface TeamMember {
  id: string
  name: string
  role: string
  bio: string
  photo: ImageAsset | null
  sortOrder: number
  isPublished: boolean
}

export interface NearbyAttraction {
  id: string
  name: string
  description: string
  distanceNote: string
  sortOrder: number
}

export type FacilityKind = 'conference' | 'event' | 'other'

export interface Facility {
  id: string
  slug: string
  name: string
  description: string
  image: ImageAsset | null
  openingHours: string | null
  pricing: 'free' | 'paid'
  priceNote: string | null
  capacity: string | null
  layouts: string[]
  ctaLabel: string | null
  ctaTopic: EnquiryTopic | null
  kind: FacilityKind
  sortOrder: number
}

export const GALLERY_CATEGORIES = ['rooms', 'facilities', 'exterior', 'dining', 'events', 'surroundings'] as const
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number]

export interface GalleryImageRecord {
  id: string
  url: string
  thumbnailUrl: string
  altText: string
  caption: string
  category: GalleryCategory
  roomTypeId: string | null
  facilityId: string | null
  width: number
  height: number
  sortOrder: number
  isPublished: boolean
  /** Dominant colour, shown while the photo loads. */
  color: string | null
  /** Optional tiny blurred preview (a base64 data URL). */
  blurDataURL: string | null
}

export interface Faq {
  id: string
  question: string
  answer: string
  sortOrder: number
}
