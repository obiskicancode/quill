import { Clock, Users } from 'lucide-react';

import { HoverZoom, Reveal } from '@/components/motion';
import { getFacilities } from '@/lib/content/data';

import { Badge } from '../rooms/AvailabilityBadge';
import { ButtonLink } from '../ui/button';
import { Photo } from '../ui/Photo';
import { FacilitiesNav } from './FacilitiesNav';

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
          <FacilitiesNav
            items={facilities.map((f) => ({
              id: f.id,
              slug: f.slug,
              name: f.name,
            }))}
          />
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
                    className="font-display text-h3"
                  >
                    {f.name}
                  </h3>
                  <Badge tone={f.pricing === 'free' ? 'accent' : 'neutral'}>
                    {f.pricing === 'free' ? 'Free' : 'Paid'}
                  </Badge>
                </div>
                {f.priceNote && (
                  <p className="mt-1 text-small font-semibold text-brand-ink">
                    {f.priceNote}
                  </p>
                )}
                <p className="mt-4 max-w-xl text-body-lg leading-prose text-ink/90">
                  {f.description}
                </p>
                <ul className="mt-4 space-y-2 text-small">
                  {f.openingHours && (
                    <li className="flex items-center gap-2">
                      <Clock
                        className="size-4 shrink-0 text-brand-ink"
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
                        className="size-4 shrink-0 text-brand-ink"
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
                  className={`aspect-4/3 w-full rounded-card ${i % 2 === 1 ? 'md:order-1' : ''}`}
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
