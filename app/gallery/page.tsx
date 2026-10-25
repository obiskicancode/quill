import type { Metadata } from 'next';

import { JsonLd } from '@/components/content/JsonLd';
import { PageHero } from '@/components/content/PageHero';
import { Section } from '@/components/content/Section';
import { SectionSkeleton } from '@/components/content/Skeletons';
import { CtaBand } from '@/components/CtaBand';
import { GallerySection } from '@/components/gallery/GallerySection';
import {
  getGalleryImages,
  getPublicSite,
  getSitePage,
} from '@/lib/content/data';
import { imageGalleryJsonLd } from '@/lib/content/jsonld';

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

export async function generateMetadata(): Promise<Metadata> {
  const page = await getSitePage('gallery');
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

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const [page, site] = await Promise.all([
    getSitePage('gallery'),
    getPublicSite(),
  ]);
  // For structured data only: a failing gallery section must not stop the page.
  const images = await getGalleryImages().catch(() => []);

  return (
    <>
      {images.length > 0 && (
        <JsonLd data={imageGalleryJsonLd(page.title, images, site)} />
      )}
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Gallery' }]}
        title={page.title}
        intro={page.intro}
        image={page.heroImage}
      />
      <Section
        label="the gallery"
        skeleton={
          <SectionSkeleton variant="grid" label="Loading the gallery" />
        }
      >
        <GallerySection
          category={one(sp.category)}
          room={one(sp.room)}
          image={one(sp.image)}
        />
      </Section>
      <CtaBand />
    </>
  );
}
