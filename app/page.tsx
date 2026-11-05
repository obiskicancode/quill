import { Amenities } from '@/components/Amenities';
import { Section } from '@/components/content/Section';
import { SectionSkeleton } from '@/components/content/Skeletons';
import { CtaBand } from '@/components/CtaBand';
import { GalleryGrid } from '@/components/GalleryGrid';
import { Hero } from '@/components/Hero';
import { FeaturedRooms } from '@/components/home/FeaturedRooms';
import { HomeSearch } from '@/components/home/HomeSearch';
import { Intro } from '@/components/home/Intro';
import { MapCard } from '@/components/MapCard';
import { TestimonialCarousel } from '@/components/TestimonialCarousel';
import {
  getFeaturedAmenities,
  getFeaturedRooms,
  getGalleryPreview,
  getHomeTestimonials,
} from '@/lib/content/data';

/**
 * Each block loads its own data below its own boundary, so a slow or failing
 * query costs one section instead of the whole homepage.
 */
async function RoomsSection() {
  return <FeaturedRooms rooms={await getFeaturedRooms()} />;
}

async function AmenitiesSection() {
  return <Amenities amenities={await getFeaturedAmenities()} />;
}

async function GalleryPreviewSection() {
  const images = await getGalleryPreview();
  return (
    <GalleryGrid
      images={images.map((image) => ({
        src: image.thumbnailUrl,
        alt: image.altText,
        href: `/gallery?image=${encodeURIComponent(image.id)}`,
        blurDataURL: image.blurDataURL,
        placeholderColor: image.color,
      }))}
    />
  );
}

async function TestimonialsSection() {
  return <TestimonialCarousel testimonials={await getHomeTestimonials()} />;
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <HomeSearch />
      <Intro />
      <Section
        label="the rooms"
        skeleton={<SectionSkeleton variant="cards" label="Loading the rooms" />}
      >
        <RoomsSection />
      </Section>
      <Section
        label="the amenities"
        skeleton={
          <SectionSkeleton variant="cards" label="Loading the amenities" />
        }
      >
        <AmenitiesSection />
      </Section>
      <Section
        label="the photos"
        skeleton={<SectionSkeleton variant="grid" label="Loading the photos" />}
      >
        <GalleryPreviewSection />
      </Section>
      <Section
        label="guest reviews"
        skeleton={
          <SectionSkeleton variant="strip" label="Loading guest reviews" />
        }
      >
        <TestimonialsSection />
      </Section>
      <MapCard />
      <CtaBand />
    </>
  );
}
