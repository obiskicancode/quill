'use client'

import { Banner } from '@/components/checkout/CheckoutStates'
import { CheckoutShell } from '@/components/checkout/CheckoutShell'
import { Button, ButtonLink } from '@/components/ui/Button'

/** Shown if the server cannot price the stay when the page loads. Retrying never creates a reservation. */
export default function CheckoutError({ reset }: { error: Error; reset: () => void }) {
  return (
    <CheckoutShell>
      <div className="container-page py-8 md:py-12">
        <Banner
          role="alert"
          tone="danger"
          title="We couldn't load your booking"
          actions={
            <>
              <Button onClick={reset}>Try again</Button>
              <ButtonLink href="/rooms" variant="secondary">Back to Rooms</ButtonLink>
            </>
          }
        >
          <p>Nothing has been reserved or charged. Please try again in a moment.</p>
        </Banner>
      </div>
    </CheckoutShell>
  )
}
