import { getPublishedTestimonials } from '@/lib/content/data';
import type { PreviewFlags } from '@/lib/content/preview';

import { TestimonialCarousel } from '../TestimonialCarousel';

/** The existing carousel, fed by published testimonials. It adds the Google reviews link when the hotel has one. */
export async function AboutTestimonials({ flags }: { flags: PreviewFlags }) {
  const items = await getPublishedTestimonials(flags);
  if (items.length === 0) return null;
  return <TestimonialCarousel testimonials={items} />;
}
