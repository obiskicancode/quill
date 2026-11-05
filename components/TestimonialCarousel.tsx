'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';

import { TextLink } from '@/components/ui/text-link';
import { useSite } from '@/providers/site.provider';
import type { Testimonial } from '@/types/site.types';

import { Carousel } from './Carousel';
import { Reveal } from './motion/Reveal';
import { TextReveal } from './motion/TextReveal';
import { blurStagger, fadeUp, viewportOnce } from './motion/variants';
import { Photo } from './ui/Photo';

function Stars({ rating }: { rating: number }) {
  return (
    <p
      role="img"
      aria-label={`Rated ${rating} out of 5`}
      className="flex justify-center gap-0.5"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-5 ${i < rating ? 'fill-primary text-brand-ink' : 'text-ink/25'}`}
          aria-hidden
        />
      ))}
    </p>
  );
}

function Quote({ t }: { t: Testimonial }) {
  const reduced = useReducedMotion();

  const inner = (
    <>
      {t.rating ? <Stars rating={t.rating} /> : null}
      <blockquote className="mt-5 font-display text-quote text-balance">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 text-left">
        {t.photo && (
          <Photo
            src={t.photo.src}
            alt={t.photo.alt}
            sizes="56px"
            className="size-14 shrink-0 rounded-full"
          />
        )}
        <span>
          <span className="block font-semibold">{t.guestName}</span>
          <span className="block text-small text-muted-foreground">
            {t.stayType}
          </span>
        </span>
      </figcaption>
    </>
  );

  const figureClass =
    'mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-2 text-center md:px-10';

  if (reduced) {
    return <figure className={figureClass}>{inner}</figure>;
  }

  return (
    <motion.figure
      className={figureClass}
      variants={blurStagger}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {t.rating ? (
        <motion.div variants={fadeUp}>
          <Stars rating={t.rating} />
        </motion.div>
      ) : null}
      <motion.blockquote
        variants={fadeUp}
        className="mt-5 font-display text-quote text-balance"
      >
        &ldquo;{t.quote}&rdquo;
      </motion.blockquote>
      <motion.figcaption
        variants={fadeUp}
        className="mt-6 flex items-center gap-3 text-left"
      >
        {t.photo && (
          <Photo
            src={t.photo.src}
            alt={t.photo.alt}
            sizes="56px"
            className="size-14 shrink-0 rounded-full"
          />
        )}
        <span>
          <span className="block font-semibold">{t.guestName}</span>
          <span className="block text-small text-muted-foreground">
            {t.stayType}
          </span>
        </span>
      </motion.figcaption>
    </motion.figure>
  );
}

/** Auto-advance is opt-in at 8 seconds and only runs with a mouse and motion allowed. A pause button is always shown when it runs. */
export function TestimonialCarousel({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const site = useSite();
  const items = testimonials.slice(0, 6);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="reviews-heading" className="bg-card section-y">
      <div className="container-page">
        <TextReveal
          as="h2"
          id="reviews-heading"
          text="What guests say"
          className="mb-10 text-center font-display text-h2 md:mb-14"
          staggerChildren={0.08}
        />
        <Carousel
          label="Guest reviews"
          itemNoun="review"
          slides={items.map((t) => (
            <Quote key={t.id} t={t} />
          ))}
          autoplayMs={8000}
          controls="below"
        />
        {site.googleReviewsUrl && (
          <Reveal className="mt-6 text-center">
            <p>
              <TextLink href={site.googleReviewsUrl} external>
                Read more reviews on Google
                <span className="sr-only"> (opens in a new tab)</span>
              </TextLink>
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
