import type { Metadata } from 'next';

import { EventsStrip } from '@/components/amenities/EventsStrip';
import { ExtrasCards } from '@/components/amenities/ExtrasCards';
import { FacilitiesSection } from '@/components/amenities/FacilitiesSection';
import { RoomAmenitiesSummary } from '@/components/amenities/RoomAmenitiesSummary';
import { JsonLd } from '@/components/content/JsonLd';
import { PageHero } from '@/components/content/PageHero';
import { PageNotPublished } from '@/components/content/PageNotPublished';
import { Section } from '@/components/content/Section';
import { SectionSkeleton } from '@/components/content/Skeletons';
import { CtaBand } from '@/components/CtaBand';
import {
  getFacilities,
  getHotelSettings,
  getPublicSite,
  getPublishedSitePage,
} from '@/lib/content/data';
import { hotelJsonLd } from '@/lib/content/jsonld';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedSitePage('amenities');
  if (!page)
    return {
      title: 'Page not published',
      robots: { index: false, follow: false },
    };
  const title = page.metaTitle ?? page.title;
  const description = page.metaDescription ?? page.intro;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        { url: (page.ogImage ?? page.heroImage).src, alt: page.heroImage.alt },
      ],
    },
  };
}

export default async function AmenitiesPage() {
  const page = await getPublishedSitePage('amenities');
  if (!page) return <PageNotPublished />;

  const [settings, site] = await Promise.all([
    getHotelSettings(),
    getPublicSite(),
  ]);
  // For the structured data only: a failing facilities section must not stop the page.
  const facilities = await getFacilities().catch(() => []);

  return (
    <>
      <JsonLd
        data={hotelJsonLd(settings, site, {
          description: page.metaDescription ?? page.intro,
          image: page.heroImage.src,
          facilities,
        })}
      />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Amenities' }]}
        title={page.title}
        intro={page.intro}
        image={page.heroImage}
      />

      <Section
        label="our facilities"
        skeleton={
          <SectionSkeleton variant="text-image" label="Loading facilities" />
        }
      >
        <FacilitiesSection />
      </Section>
      <Section
        label="room amenities"
        skeleton={
          <SectionSkeleton variant="cards" label="Loading room amenities" />
        }
      >
        <RoomAmenitiesSummary />
      </Section>
      <Section
        label="paid extras"
        skeleton={
          <SectionSkeleton variant="cards" label="Loading paid extras" />
        }
      >
        <ExtrasCards />
      </Section>
      <Section
        label="conference and events"
        skeleton={
          <SectionSkeleton
            variant="strip"
            label="Loading conference and events"
          />
        }
      >
        <EventsStrip />
      </Section>

      <CtaBand />
    </>
  );
}
