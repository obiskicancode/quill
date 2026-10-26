'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Clock, MapPin, Navigation, Phone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { HotelInfo } from '@/types/booking.types';

import { EASE_OUT } from '../motion/variants';
import { ButtonLink } from '../ui/Button';

/** The map loads only when it scrolls into view. Until then (or with no address) a static card and a plain address link show. */
function LazyMap({ hotel }: { hotel: HotelInfo }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !hotel.mapQuery) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hotel.mapQuery]);

  const query = hotel.mapQuery;
  const fade = reduced
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3, ease: EASE_OUT },
      };
  return (
    <div
      ref={ref}
      className="rounded-card bg-ink/10 relative aspect-[4/3] w-full overflow-hidden md:aspect-[16/10]"
    >
      <AnimatePresence initial={false}>
        {near && query ? (
          <motion.div key="map" className="absolute inset-0" {...fade}>
            <iframe
              title={`Map showing the location of ${hotel.name}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full border-0"
            />
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
            {...fade}
          >
            <MapPin className="text-ink/50 size-10" aria-hidden />
            <p className="text-small text-muted max-w-xs">
              {query
                ? 'Loading the map as you scroll.'
                : 'The map appears here once the hotel address is added.'}
            </p>
            {query && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
              >
                Open the address in Maps
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function GettingHere({ hotel }: { hotel: HotelInfo }) {
  const directions = hotel.mapQuery
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotel.mapQuery)}`
    : null;
  return (
    <section
      aria-labelledby="here-title"
      className="rounded-card border-line bg-surface shadow-raised grid gap-6 border p-5 md:p-6 lg:grid-cols-2 lg:gap-8"
    >
      <div>
        <h2 id="here-title" className="font-display text-h3">
          Getting here
        </h2>
        <address className="mt-4 flex gap-3 not-italic">
          <MapPin
            className="text-accent-ink mt-1 size-5 shrink-0"
            aria-hidden
          />
          <span>
            {hotel.addressLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </span>
        </address>
        <p className="text-small mt-3 flex gap-3">
          <Clock
            className="text-accent-ink mt-0.5 size-5 shrink-0"
            aria-hidden
          />
          <span>
            <span className="font-semibold">Reception: </span>
            {hotel.reception}
          </span>
        </p>
        <p className="text-small text-ink/85 mt-3">{hotel.howToFindUs}</p>
        <ul
          aria-label="Nearby landmarks"
          className="text-small text-muted mt-3 space-y-1"
        >
          {hotel.landmarks.slice(0, 2).map((l) => (
            <li key={l.name}>
              {l.name}, {l.distance}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row print:hidden">
          {directions && (
            <ButtonLink
              href={directions}
              external
              icon={<Navigation className="size-5" aria-hidden />}
            >
              Get Directions
              <span className="sr-only"> (opens in a new tab)</span>
            </ButtonLink>
          )}
          <ButtonLink
            href={`tel:${hotel.phoneTel}`}
            variant="secondary"
            icon={<Phone className="size-5" aria-hidden />}
          >
            Call {hotel.phoneDisplay}
          </ButtonLink>
        </div>
      </div>
      <div className="print:hidden">
        <LazyMap hotel={hotel} />
      </div>
    </section>
  );
}
