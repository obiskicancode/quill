'use client';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { Reveal } from '@/components/motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, ButtonLink } from '@/components/ui/button';
import { ERROR_MESSAGES } from '@/constants/error-messages';

/** Shown if the server cannot price the stay when the page loads. Retrying never creates a reservation. */
export default function CheckoutError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <CheckoutShell>
      <div className="container-page py-8 md:py-12">
        <Reveal>
          <Alert role="alert" variant="destructive" size="banner">
            <AlertTitle>{ERROR_MESSAGES.COULD_NOT_LOAD_BOOKING}</AlertTitle>
            <AlertDescription>
              <p>
                Nothing has been reserved or charged. Please try again in a
                moment.
              </p>
            </AlertDescription>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={reset}>Try again</Button>
              <ButtonLink href="/rooms" variant="secondary">
                Back to Rooms
              </ButtonLink>
            </div>
          </Alert>
        </Reveal>
      </div>
    </CheckoutShell>
  );
}
