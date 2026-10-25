import type { Metadata } from 'next';

import { AboutTestimonials } from '@/components/about/AboutTestimonials';
import { HighlightsStrip } from '@/components/about/HighlightsStrip';
import { StorySection } from '@/components/about/StorySection';
import { SurroundingsSection } from '@/components/about/SurroundingsSection';
import { TeamSection } from '@/components/about/TeamSection';
import { ValueCards } from '@/components/about/ValueCards';
import { JsonLd } from '@/components/content/JsonLd';
import { PageHero } from '@/components/content/PageHero';
import { Section } from '@/components/content/Section';
import { SectionSkeleton } from '@/components/content/Skeletons';
import { CtaBand } from '@/components/CtaBand';
import {
  getHotelSettings,
  getPublicSite,
  getSitePage,
} from '@/lib/content/data';
import { hotelJsonLd } from '@/lib/content/jsonld';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getSitePage('about');
  const title = page.metaTitle ?? page.title;
  const description = page.metaDescription ?? page.intro;
  const image = (page.ogImage ?? page.heroImage).src;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: image, alt: page.heroImage.alt }],
    },
  };
}

export default async function AboutPage() {
  const [page, settings, site] = await Promise.all([
    getSitePage('about'),
    getHotelSettings(),
    getPublicSite(),
  ]);

  return (
    <>
      <JsonLd
        data={hotelJsonLd(settings, site, {
          description: page.metaDescription ?? page.intro,
          image: page.heroImage.src,
        })}
      />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
        title={page.title}
        intro={page.intro}
        image={page.heroImage}
      />

      <Section
        label="our story"
        skeleton={
          <SectionSkeleton variant="text-image" label="Loading our story" />
        }
      >
        <StorySection />
      </Section>
      <Section
        label="what to expect"
        skeleton={
          <SectionSkeleton variant="cards" label="Loading what to expect" />
        }
      >
        <ValueCards />
      </Section>
      <Section
        label="highlights"
        skeleton={
          <SectionSkeleton variant="strip" label="Loading highlights" />
        }
      >
        <HighlightsStrip />
      </Section>
      <Section
        label="the team"
        skeleton={<SectionSkeleton variant="cards" label="Loading the team" />}
      >
        <TeamSection />
      </Section>
      <Section
        label="the surroundings"
        skeleton={
          <SectionSkeleton variant="list" label="Loading the surroundings" />
        }
      >
        <SurroundingsSection />
      </Section>
      <Section
        label="guest reviews"
        skeleton={
          <SectionSkeleton variant="strip" label="Loading guest reviews" />
        }
      >
        <AboutTestimonials />
      </Section>

      <CtaBand />
    </>
  );
}
