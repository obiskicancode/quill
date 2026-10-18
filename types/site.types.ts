export type AmenityKey =
  | 'wifi' | 'parking' | 'restaurant' | 'pool' | 'power' | 'security' | 'conference'
  | 'airport' | 'ac' | 'tv' | 'kitchen' | 'breakfast' | 'laundry' | 'workdesk'

export interface ImageAsset {
  src: string
  alt: string
}

export interface Amenity {
  key: AmenityKey
  label: string
  description?: string
}

export interface Room {
  id: string
  slug: string
  name: string
  bedType: string
  maxGuests: number
  /** Icons shown on the card use the first three. */
  amenities: AmenityKey[]
  /** Price per night in naira. Ignored when priceHidden is true. */
  priceNgn: number | null
  priceHidden: boolean
  secondaryPrice?: { currency: 'USD' | 'GBP' | 'EUR'; amount: number }
  /** 1 to 8 images. */
  images: ImageAsset[]
}

export interface Testimonial {
  id: string
  quote: string
  guestName: string
  stayType: string
  /** 1 to 5. Optional. */
  rating?: number
  photo?: ImageAsset
}

export interface NavItem {
  label: string
  href: string
}

export interface TrustItem {
  id: 'reviews' | 'secure-payment' | 'free-cancellation' | 'power-security'
  label: string
  enabled: boolean
}

export interface SiteConfig {
  name: string
  shortName: string
  description: string
  url: string
  logo: { src: string; alt: string; width: number; height: number } | null
  /** Where every Book Now button and the search form send the visitor. */
  bookingHref: string
  nav: NavItem[]
  contact: {
    phoneDisplay: string
    phoneTel: string
    /** Digits only, with country code. */
    whatsappNumber: string
    whatsappMessage: string
    email: string
  }
  address: { lines: string[]; mapQuery: string | null }
  reception: string
  landmarks: { name: string; distance: string }[]
  social: { label: string; href: string; platform: 'instagram' | 'facebook' }[]
  googleReviewsUrl: string | null
  reviews: { rating: number | null; count: number | null }
  policies: NavItem[]
  trust: TrustItem[]
  hero: {
    headline: string
    subheadline: string
    image: ImageAsset
    video: { src: string; type: string } | null
  }
  intro: { heading: string; body: string[]; image: ImageAsset; learnMoreHref: string }
  cta: { heading: string; text: string }
}

export interface SearchState {
  checkIn: string | null
  checkOut: string | null
  adults: number
  children: number
}
