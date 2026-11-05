'use client';

import { useEffect } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { PageHeading } from '@/components/ui/page-heading';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section aria-labelledby="err-title" className="container-page section-y">
      <div className="max-w-xl">
        <PageHeading id="err-title" className="font-display text-h2">
          Something went wrong
        </PageHeading>
        <p className="mt-3 text-body-lg text-ink/85">
          We could not load that page. Try again, or go back to a safe page.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary">
            Back to home
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
