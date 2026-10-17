import { Star } from 'lucide-react'
import { site } from '@/lib/site'
import type { Testimonial } from '@/lib/types'
import { Carousel } from './Carousel'
import { Photo } from './ui/Photo'
import { TextLink } from './ui/TextLink'

function Stars({ rating }: { rating: number }) {
  return (
    <p role="img" aria-label={`Rated ${rating} out of 5`} className="flex justify-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`size-5 ${i < rating ? 'fill-accent text-accent-ink' : 'text-ink/25'}`} aria-hidden />
      ))}
    </p>
  )
}

function Quote({ t }: { t: Testimonial }) {
  return (
    <figure className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-2 text-center md:px-10">
      {t.rating ? <Stars rating={t.rating} /> : null}
      <blockquote className="mt-5 font-display text-[clamp(1.375rem,1.1rem+1vw,2rem)] leading-snug text-balance">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 text-left">
        {t.photo && <Photo src={t.photo.src} alt={t.photo.alt} sizes="56px" className="size-14 shrink-0 rounded-full" />}
        <span>
          <span className="block font-semibold">{t.guestName}</span>
          <span className="block text-small text-muted">{t.stayType}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/** Auto-advance is opt-in at 8 seconds and only runs with a mouse and motion allowed. A pause button is always shown when it runs. */
export function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const items = testimonials.slice(0, 6)
  if (items.length === 0) return null
  return (
    <section aria-labelledby="reviews-heading" className="section-y bg-surface">
      <div className="container-page">
        <h2 id="reviews-heading" className="mb-10 text-center font-display text-h2 md:mb-14">
          What guests say
        </h2>
        <Carousel label="Guest reviews" slides={items.map((t) => <Quote key={t.id} t={t} />)} autoplayMs={8000} controls="below" />
        {site.googleReviewsUrl && (
          <p className="mt-6 text-center">
            <TextLink href={site.googleReviewsUrl} external>
              Read more reviews on Google
              <span className="sr-only"> (opens in a new tab)</span>
            </TextLink>
          </p>
        )}
      </div>
    </section>
  )
}
