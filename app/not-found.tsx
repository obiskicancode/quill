import Link from 'next/link';

import { ButtonLink } from '@/components/ui/button';

/** Global 404. Rendered inside the root layout, so the header and footer stay in place. */
export default function NotFound() {
  return (
    <section aria-labelledby="nf-title" className="container-page section-y">
      <div className="max-w-xl">
        <p
          aria-hidden
          className="font-display text-display text-brand-ink leading-none"
        >
          404
        </p>
        <h1 tabIndex={-1} id="nf-title" className="font-display text-h2 mt-2">
          This page has checked out
        </h1>
        <p className="text-body-lg text-ink/85 mt-3">
          The page you were looking for may have moved or no longer exists.
          Let&rsquo;s get you back on track.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/rooms" variant="secondary">
            Browse rooms
          </ButtonLink>
        </div>
        <p className="text-small text-muted-foreground mt-6">
          Looking for something specific?{' '}
          <Link
            href="/enquiry"
            className="decoration-brand font-semibold underline decoration-2 underline-offset-4"
          >
            Send us a booking enquiry
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
