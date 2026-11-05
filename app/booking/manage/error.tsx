'use client';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { Reveal } from '@/components/motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, ButtonLink } from '@/components/ui/button';
import { ERROR_MESSAGES } from '@/constants/error-messages';

/** Server error while loading the page. Trying again only reads; it never changes the booking. */
export default function ManageError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <CheckoutShell label="Manage booking" backToHome>
      <div className="container-page max-w-3xl py-10">
        <Reveal>
          <Alert role="alert" variant="destructive" size="banner">
            <AlertTitle>{ERROR_MESSAGES.COULD_NOT_LOAD_PAGE}</AlertTitle>
            <AlertDescription>
              <p>
                Your booking has not changed. Please try again in a moment, or
                contact the hotel with your booking reference.
              </p>
            </AlertDescription>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={reset}>Try again</Button>
              <ButtonLink href="/" variant="secondary">
                Back to home
              </ButtonLink>
            </div>
          </Alert>
        </Reveal>
      </div>
    </CheckoutShell>
  );
}
