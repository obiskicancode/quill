import { getPublishedTestimonials } from '@/lib/content/data';

import { TestimonialCarousel } from '../TestimonialCarousel';

/** The existing carousel, fed by published testimonials. It adds the Google reviews link when the hotel has one. */
export async function AboutTestimonials() {
  const items = await getPublishedTestimonials();
  if (items.length === 0) return null;
  return <TestimonialCarousel testimonials={items} />;
}
