import { Amenities } from '@/components/Amenities';
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

export default async function HomePage() {
  const [featuredRooms, featuredAmenities, galleryPreview, testimonials] =
    await Promise.all([
      getFeaturedRooms(),
      getFeaturedAmenities(),
      getGalleryPreview(),
      getHomeTestimonials(),
    ]);
  return (
    <>
      <Hero />
      <HomeSearch />
      <Intro />
      <FeaturedRooms rooms={featuredRooms} />
      <Amenities amenities={featuredAmenities} />
      <GalleryGrid
        images={galleryPreview.map((g) => ({ src: g.url, alt: g.altText }))}
      />
      <TestimonialCarousel testimonials={testimonials} />
      <MapCard />
      <CtaBand />
    </>
  );
}
