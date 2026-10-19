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
  featuredAmenities,
  featuredRooms,
  galleryPreview,
  testimonials,
} from '@/lib/data';

export default function HomePage() {
  return (
    <>
      <Hero />
      <HomeSearch />
      <Intro />
      <FeaturedRooms rooms={featuredRooms} />
      <Amenities amenities={featuredAmenities} />
      <GalleryGrid images={galleryPreview} />
      <TestimonialCarousel testimonials={testimonials} />
      <MapCard />
      <CtaBand />
    </>
  );
}
