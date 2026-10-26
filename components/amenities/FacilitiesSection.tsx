import { Clock, Users } from 'lucide-react';

import {
  HoverZoom,
  Reveal,
  StaggerGroup,
  StaggerItem,
} from '@/components/motion';
import { getFacilities } from '@/lib/content/data';

import { Badge } from '../rooms/AvailabilityBadge';
import { ButtonLink } from '../ui/Button';
import { Photo } from '../ui/Photo';

/**
 * One block per facility, in sort order. Image and text alternate on desktop and stack on mobile.
 * A sticky jump menu appears only when there are four or more facilities. Missing fields (image, hours, capacity, CTA) are simply left out.
 */
export async function FacilitiesSection() {
  const facilities = await getFacilities();
  if (facilities.length === 0) return null;

  return (
    <section
      aria-labelledby="facilities-title"
      className="section-y pt-8 md:pt-10"
    >
      <div className="container-page">
        <h2 id="facilities-title" className="sr-only">
          Facilities
        </h2>

        {facilities.length >= 4 && (
          <nav
            aria-label="Jump to a facility"
            className="border-line bg-paper/95 sticky top-16 z-20 -mx-5 mb-10 border-b px-5 py-2 backdrop-blur md:-mx-8 md:px-8 xl:-mx-10 xl:px-10"
          >
            <StaggerGroup
              as="ul"
              staggerChildren={0.04}
              className="flex [scrollbar-width:none] gap-2 overflow-x-auto py-1 [&::-webkit-scrollbar]:hidden"
            >
              {facilities.map((f) => (
                <StaggerItem key={f.id} as="li" scale className="shrink-0">
                  <a
                    href={`#facility-${f.slug}`}
                    className="border-ink/50 bg-surface text-small hover:bg-ink hover:text-paper inline-flex min-h-11 items-center rounded-full border px-4 font-semibold transition-colors"
                  >
                    {f.name}
                  </a>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </nav>
        )}

        <div className="space-y-16 md:space-y-24">
          {facilities.map((f, i) => (
            <article
              key={f.id}
              id={`facility-${f.slug}`}
              aria-labelledby={`facility-${f.slug}-name`}
              className={`group/media grid scroll-mt-36 items-center gap-8 md:gap-12 ${f.image ? 'md:grid-cols-2' : ''}`}
            >
              <Reveal
                delay={i % 2 === 1 ? 0.08 : 0}
                className={`${f.image ? '' : 'max-w-2xl'} ${f.image && i % 2 === 1 ? 'md:order-2' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3
                    id={`facility-${f.slug}-name`}
                    className="font-display text-h2"
                  >
                    {f.name}
                  </h3>
                  <Badge tone={f.pricing === 'free' ? 'accent' : 'neutral'}>
                    {f.pricing === 'free' ? 'Free' : 'Paid'}
                  </Badge>
                </div>
                {f.priceNote && (
                  <p className="text-small text-accent-ink mt-1 font-semibold">
                    {f.priceNote}
                  </p>
                )}
                <p className="text-body-lg text-ink/90 mt-4 max-w-xl leading-[1.7]">
                  {f.description}
                </p>
                <ul className="text-small mt-4 space-y-2">
                  {f.openingHours && (
                    <li className="flex items-center gap-2">
                      <Clock
                        className="text-accent-ink size-4 shrink-0"
                        aria-hidden
                      />
                      <span>
                        <span className="font-semibold">Hours: </span>
                        {f.openingHours}
                      </span>
                    </li>
                  )}
                  {f.capacity && (
                    <li className="flex items-center gap-2">
                      <Users
                        className="text-accent-ink size-4 shrink-0"
                        aria-hidden
                      />
                      <span>
                        <span className="font-semibold">Capacity: </span>
                        {f.capacity}
                      </span>
                    </li>
                  )}
                </ul>
                {f.ctaLabel && (
                  <div className="mt-6">
                    <ButtonLink
                      href={`/contact?topic=${f.ctaTopic ?? 'general'}`}
                      variant="secondary"
                    >
                      {f.ctaLabel}
                    </ButtonLink>
                  </div>
                )}
              </Reveal>
              {f.image && (
                <HoverZoom
                  className={`rounded-card aspect-[4/3] w-full ${i % 2 === 1 ? 'md:order-1' : ''}`}
                >
                  <Photo
                    src={f.image.src}
                    alt={f.image.alt}
                    sizes="(min-width: 768px) 45vw, 100vw"
                    priority={i === 0}
                    className="h-full w-full"
                  />
                </HoverZoom>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
