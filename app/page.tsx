import { Amenities } from "@/components/Amenities";
import { CtaBand } from "@/components/CtaBand";
import { GalleryGrid } from "@/components/GalleryGrid";
import { Hero } from "@/components/Hero";
import { FeaturedRooms } from "@/components/home/FeaturedRooms";
import { Intro } from "@/components/home/Intro";
import { MapCard } from "@/components/MapCard";
import { SearchBar } from "@/components/SearchBar";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { TrustStrip } from "@/components/TrustStrip";
import {
  featuredAmenities,
  featuredRooms,
  galleryPreview,
  testimonials,
} from "@/lib/data";

export default function HomePage() {
  return (
    <>
      <Hero />
      <section
        aria-label="Check availability"
        className="relative z-20 -mt-10 md:-mt-12"
      >
        <div className="container-page">
          <SearchBar />
          <TrustStrip />
        </div>
      </section>
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
