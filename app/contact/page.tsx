import type { Metadata } from 'next'
import { ContactCards } from '@/components/contact/ContactCards'
import { FaqSection } from '@/components/contact/FaqSection'
import { FormSection } from '@/components/contact/FormSection'
import { LocationSection } from '@/components/contact/LocationSection'
import { SocialLinks } from '@/components/contact/SocialLinks'
import { CtaBand } from '@/components/CtaBand'
import { JsonLd } from '@/components/content/JsonLd'
import { PageHero } from '@/components/content/PageHero'
import { Section } from '@/components/content/Section'
import { SectionSkeleton } from '@/components/content/Skeletons'
import { getHotelSettings, getSitePage } from '@/lib/content/data'
import { hotelJsonLd } from '@/lib/content/jsonld'
import { parsePreview, previewValue } from '@/lib/content/preview'

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

export function generateMetadata(): Metadata {
  const page = getSitePage('contact')
  const title = page.metaTitle ?? page.title
  const description = page.metaDescription ?? page.intro
  return { title, description, openGraph: { title, description, type: 'website', images: [{ url: (page.ogImage ?? page.heroImage).src, alt: page.heroImage.alt }] } }
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams
  const flags = parsePreview(sp.preview)
  const page = getSitePage('contact')
  const formDemo = previewValue(sp.preview, 'form')

  return (
    <>
      <JsonLd data={hotelJsonLd(getHotelSettings(), { description: page.metaDescription ?? page.intro, image: page.heroImage.src, contact: true })} />
      <PageHero crumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} title={page.title} intro={page.intro} image={page.heroImage} />

      <Section label="our contact details" skeleton={<SectionSkeleton variant="cards" label="Loading contact details" />}>
        <ContactCards flags={flags} />
      </Section>
      <Section label="the contact form" skeleton={<SectionSkeleton variant="form" label="Loading the contact form" />}>
        <FormSection flags={flags} topic={one(sp.topic)} room={one(sp.room)} bookingRef={one(sp.ref)} demo={formDemo} />
      </Section>
      <Section label="the map" skeleton={<SectionSkeleton variant="text-image" label="Loading the map" />}>
        <LocationSection flags={flags} />
      </Section>
      <Section label="our social links" skeleton={<SectionSkeleton variant="strip" label="Loading social links" />}>
        <SocialLinks flags={flags} />
      </Section>
      <Section label="common questions" skeleton={<SectionSkeleton variant="list" label="Loading common questions" />}>
        <FaqSection flags={flags} />
      </Section>

      <CtaBand />
    </>
  )
}
