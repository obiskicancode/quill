'use client';

import Link from 'next/link';

import { ButtonLink } from '@/components/ui/Button';

/** Global 404. Rendered inside the root layout, so the header and footer stay in place. */
export default function NotFound() {
  return (
    <section aria-labelledby="nf-title" className="container-page section-y">
      <div className="max-w-xl">
        <p
          aria-hidden
          className="font-display text-display leading-none text-accent-ink"
        >
          404
        </p>
        <h1 tabIndex={-1} id="nf-title" className="mt-2 font-display text-h2">
          This page has checked out
        </h1>
        <p className="mt-3 text-body-lg text-ink/85">
          The page you were looking for may have moved or no longer exists.
          Let&rsquo;s get you back on track.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/rooms" variant="secondary">
            Browse rooms
          </ButtonLink>
        </div>
        <p className="mt-6 text-small text-muted">
          Looking for something specific?{' '}
          <Link
            href="/enquiry"
            className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
          >
            Send us a booking enquiry
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
