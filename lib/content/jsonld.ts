import { site } from '../site'
import type { Facility, Faq, GalleryImageRecord, HotelSettings } from './types'

/** JSON-LD builders. Placeholder values (anything in [brackets]) and empty fields are left out, so no fake data reaches search engines. */

const real = (v: string | null | undefined): v is string => Boolean(v) && !v!.startsWith('[') && !v!.includes('[')
const abs = (src: string) => new URL(src, site.url).toString()

interface HotelOptions {
  description?: string
  image?: string
  facilities?: Facility[]
  contact?: boolean
}

export function hotelJsonLd(s: HotelSettings, o: HotelOptions = {}): Record<string, unknown> {
  const a = s.address
  const address = {
    '@type': 'PostalAddress',
    ...(real(a.line1) && { streetAddress: a.line1 }),
    ...(real(a.city) && { addressLocality: a.city }),
    ...(real(a.state) && { addressRegion: a.state }),
    addressCountry: a.country,
  }
  const phone = s.publicPhones.find((p) => real(p.display))
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: s.displayName,
    url: site.url,
    ...(o.description && { description: o.description }),
    ...(o.image && { image: abs(o.image) }),
    ...(Object.keys(address).length > 2 && { address }),
    ...(phone && { telephone: phone.tel }),
    ...(s.yearEstablished && { foundingDate: String(s.yearEstablished) }),
    ...(o.facilities?.length && {
      amenityFeature: o.facilities.map((f) => ({ '@type': 'LocationFeatureSpecification', name: f.name, value: true })),
    }),
    ...(o.contact && phone && {
      contactPoint: { '@type': 'ContactPoint', telephone: phone.tel, contactType: 'reception', ...(real(s.receptionHours) && { hoursAvailable: s.receptionHours }) },
    }),
    ...(o.contact && s.latitude !== null && s.longitude !== null && { geo: { '@type': 'GeoCoordinates', latitude: s.latitude, longitude: s.longitude } }),
  }
}

/** Returns null when no FAQ has real (non-placeholder) text, so nothing is emitted. */
export function faqJsonLd(all: Faq[]): Record<string, unknown> | null {
  const faqs = all.filter((f) => real(f.question) && real(f.answer))
  if (faqs.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  }
}

export function imageGalleryJsonLd(name: string, images: GalleryImageRecord[], max = 12): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name,
    image: images.slice(0, max).map((g) => ({ '@type': 'ImageObject', contentUrl: abs(g.url), thumbnailUrl: abs(g.thumbnailUrl), ...(real(g.caption) && { caption: g.caption }), ...(real(g.altText) && { description: g.altText }), width: g.width, height: g.height })),
  }
}
