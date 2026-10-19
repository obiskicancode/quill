'use client';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { Banner } from '@/components/checkout/CheckoutStates';
import { Reveal } from '@/components/motion';
import { Button, ButtonLink } from '@/components/ui/Button';

/** Server error while loading the page. Trying again only reads; it never changes the reservation. */
export default function ConfirmationError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <CheckoutShell label="Your booking" backToHome>
      <div className="container-page max-w-3xl py-10">
        <Reveal>
          <Banner
            role="alert"
            tone="danger"
            title="We couldn't load your booking"
            actions={
              <>
                <Button onClick={reset}>Try again</Button>
                <ButtonLink href="/" variant="secondary">
                  Back to home
                </ButtonLink>
              </>
            }
          >
            <p>
              Your booking has not changed. Please try again in a moment, or
              contact the hotel with your booking reference.
            </p>
          </Banner>
        </Reveal>
      </div>
    </CheckoutShell>
  );
}
