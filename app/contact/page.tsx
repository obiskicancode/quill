import type { Metadata } from 'next';

import { ContactCards } from '@/components/contact/ContactCards';
import { FaqSection } from '@/components/contact/FaqSection';
import { FormSection } from '@/components/contact/FormSection';
import { LocationSection } from '@/components/contact/LocationSection';
import { SocialLinks } from '@/components/contact/SocialLinks';
import { JsonLd } from '@/components/content/JsonLd';
import { PageHero } from '@/components/content/PageHero';
import { PageNotPublished } from '@/components/content/PageNotPublished';
import { Section } from '@/components/content/Section';
import { SectionSkeleton } from '@/components/content/Skeletons';
import { CtaBand } from '@/components/CtaBand';
import {
  getHotelSettings,
  getPublicSite,
  getPublishedSitePage,
} from '@/lib/content/data';
import { hotelJsonLd } from '@/lib/content/jsonld';

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedSitePage('contact');
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

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const page = await getPublishedSitePage('contact');
  if (!page) return <PageNotPublished />;

  const [settings, site] = await Promise.all([
    getHotelSettings(),
    getPublicSite(),
  ]);

  return (
    <>
      <JsonLd
        data={hotelJsonLd(settings, site, {
          description: page.metaDescription ?? page.intro,
          image: page.heroImage.src,
          contact: true,
        })}
      />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
        title={page.title}
        intro={page.intro}
        image={page.heroImage}
      />

      <Section
        label="our contact details"
        skeleton={
          <SectionSkeleton variant="cards" label="Loading contact details" />
        }
      >
        <ContactCards />
      </Section>
      <Section
        label="the contact form"
        skeleton={
          <SectionSkeleton variant="form" label="Loading the contact form" />
        }
      >
        <FormSection
          topic={one(sp.topic)}
          room={one(sp.room)}
          bookingRef={one(sp.ref)}
        />
      </Section>
      <Section
        label="the map"
        skeleton={
          <SectionSkeleton variant="text-image" label="Loading the map" />
        }
      >
        <LocationSection />
      </Section>
      <Section
        label="our social links"
        skeleton={
          <SectionSkeleton variant="strip" label="Loading social links" />
        }
      >
        <SocialLinks />
      </Section>
      <Section
        label="common questions"
        skeleton={
          <SectionSkeleton variant="list" label="Loading common questions" />
        }
      >
        <FaqSection />
      </Section>

      <CtaBand />
    </>
  );
}
