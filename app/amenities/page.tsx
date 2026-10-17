import type { Metadata } from 'next'
import { EventsStrip } from '@/components/amenities/EventsStrip'
import { ExtrasCards } from '@/components/amenities/ExtrasCards'
import { FacilitiesSection } from '@/components/amenities/FacilitiesSection'
import { RoomAmenitiesSummary } from '@/components/amenities/RoomAmenitiesSummary'
import { CtaBand } from '@/components/CtaBand'
import { JsonLd } from '@/components/content/JsonLd'
import { PageHero } from '@/components/content/PageHero'
import { Section } from '@/components/content/Section'
import { SectionSkeleton } from '@/components/content/Skeletons'
import { getFacilities, getHotelSettings, getSitePage } from '@/lib/content/data'
import { hotelJsonLd } from '@/lib/content/jsonld'
import { parsePreview } from '@/lib/content/preview'

export function generateMetadata(): Metadata {
  const page = getSitePage('amenities')
  const title = page.metaTitle ?? page.title
  const description = page.metaDescription ?? page.intro
  return { title, description, openGraph: { title, description, type: 'website', images: [{ url: (page.ogImage ?? page.heroImage).src, alt: page.heroImage.alt }] } }
}

export default async function AmenitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Preview switches exist only in development. Not reading searchParams in production keeps this page static.
  const flags = process.env.NODE_ENV === 'production' ? parsePreview(undefined) : parsePreview((await searchParams).preview)
  const page = getSitePage('amenities')
  // For the structured data only: a failing facilities section must not stop the page.
  const facilities = await getFacilities(parsePreview(undefined)).catch(() => [])

  return (
    <>
      <JsonLd data={hotelJsonLd(getHotelSettings(), { description: page.metaDescription ?? page.intro, image: page.heroImage.src, facilities })} />
      <PageHero crumbs={[{ label: 'Home', href: '/' }, { label: 'Amenities' }]} title={page.title} intro={page.intro} image={page.heroImage} />

      <Section label="our facilities" skeleton={<SectionSkeleton variant="text-image" label="Loading facilities" />}>
        <FacilitiesSection flags={flags} />
      </Section>
      <Section label="room amenities" skeleton={<SectionSkeleton variant="cards" label="Loading room amenities" />}>
        <RoomAmenitiesSummary flags={flags} />
      </Section>
      <Section label="paid extras" skeleton={<SectionSkeleton variant="cards" label="Loading paid extras" />}>
        <ExtrasCards flags={flags} />
      </Section>
      <Section label="conference and events" skeleton={<SectionSkeleton variant="strip" label="Loading conference and events" />}>
        <EventsStrip flags={flags} />
      </Section>

      <CtaBand />
    </>
  )
}
