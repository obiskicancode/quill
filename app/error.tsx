'use client';

import { useEffect } from 'react';

import { Button, ButtonLink } from '@/components/ui/Button';

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
        <h1 tabIndex={-1} id="err-title" className="font-display text-h2">
          Something went wrong
        </h1>
        <p className="text-body-lg text-ink/85 mt-3">
          We could not load that page. Try again, or go back to a safe page.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <Button type="button" variant="secondary" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </section>
  );
}
