import { Star } from 'lucide-react';

import type { RoomTestimonial } from '@/lib/rooms';

import { StaggerGroup } from '../motion/StaggerGroup';
import { StaggerItem } from '../motion/StaggerItem';

/** Rendered only when this room has reviews. */
export function RoomReviews({ reviews }: { reviews: RoomTestimonial[] }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="font-display text-h3">
        What guests say about this room
      </h2>
      <StaggerGroup
        as="ul"
        className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
        staggerChildren={0.08}
      >
        {reviews.map((r) => (
          <StaggerItem as="li" key={r.id} className="h-full">
            <figure className="h-full rounded-card border border-line bg-surface p-5">
              <p
                role="img"
                aria-label={`Rated ${r.rating} out of 5`}
                className="flex gap-0.5"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`size-5 ${i < r.rating ? 'fill-accent text-accent-ink' : 'text-ink/25'}`}
                    aria-hidden
                  />
                ))}
              </p>
              <blockquote className="mt-3 text-ink/90">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-3 text-small">
                <span className="font-semibold">{r.guestName}</span>
                <span className="text-muted">, {r.stayType}</span>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
