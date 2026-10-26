'use client';

import { useEffect, useRef } from 'react';

import { ButtonLink } from '@/components/ui/Button';

export default function RoomNotFound() {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section aria-labelledby="nf-title" className="container-page section-y">
      <h1
        ref={heading}
        tabIndex={-1}
        id="nf-title"
        className="font-display text-h2"
      >
        We couldn&rsquo;t find that room
      </h1>
      <p className="text-body-lg text-ink/85 mt-3 max-w-lg">
        It may have been renamed or is no longer available. Browse our rooms and
        apartments to find one that suits your stay.
      </p>
      <div className="mt-8">
        <ButtonLink href="/rooms" size="lg">
          Back to Rooms
        </ButtonLink>
      </div>
    </section>
  );
}
