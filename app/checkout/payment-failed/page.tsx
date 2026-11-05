import { AlertTriangle } from 'lucide-react';
import type { Metadata } from 'next';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { HoldRemainingNotice } from '@/components/checkout/CheckoutStates';
import { ButtonLink } from '@/components/ui/button';
import { TextLink } from '@/components/ui/text-link';
import { isActionableForCheckout } from '@/lib/booking/recovery';
import { loadReservation } from '@/lib/booking/view';

export const metadata: Metadata = {
  title: 'Payment not completed',
  robots: { index: false, follow: false },
};

/**
 * Whether the room is still held is a question about the clock, so it is
 * answered once, outside render, together with the server time the countdown
 * on the page is measured against.
 */
async function recoveryState(ref: string | null) {
  const reservation = ref ? await loadReservation(ref) : null;
  const serverNowMs = Date.now();
  const held =
    reservation !== null && isActionableForCheckout(reservation, serverNowMs);
  return {
    reservation,
    serverNowMs,
    held,
    released:
      reservation !== null && !held && reservation.holdExpiresAt <= serverNowMs,
  };
}

/**
 * The payment provider returned a failed/cancelled state. The global Header and Footer are hidden on
 * /checkout (see HideOnCheckout), so this renders the same simplified chrome the confirmation page uses.
 */
export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (name: string): string | null => {
    const v = sp[name];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };
  const ref = get('ref');
  const { reservation, serverNowMs, held, released } = await recoveryState(ref);

  const retryHref = reservation
    ? `/checkout?${new URLSearchParams({
        room: reservation.roomSlug,
        checkIn: reservation.stay.checkIn,
        checkOut: reservation.stay.checkOut,
        adults: String(reservation.stay.adults),
        children: String(reservation.stay.children),
        extraBed: reservation.stay.extraBed ? '1' : '0',
        ref: reservation.reference,
        return: '1',
      }).toString()}`
    : null;

  const searchAgainHref = reservation
    ? `/rooms?${new URLSearchParams({
        checkIn: reservation.stay.checkIn,
        checkOut: reservation.stay.checkOut,
        adults: String(reservation.stay.adults),
        children: String(reservation.stay.children),
      }).toString()}`
    : '/rooms';

  /** The recovery move comes first; browsing is the fallback, never the headline. */
  const recoveryHref = retryHref
    ? retryHref
    : ref
      ? `/booking/manage?ref=${encodeURIComponent(ref)}`
      : null;

  return (
    <CheckoutShell label="Secure checkout" backToHome>
      <section aria-labelledby="pf-title" className="container-page section-y">
        <div className="mx-auto max-w-xl space-y-5">
          <AlertTriangle className="size-10 text-destructive" aria-hidden />
          <h1 id="pf-title" className="font-display text-h2">
            Payment not completed
          </h1>
          <p className="text-body-lg text-ink/85">
            The payment was not completed or was cancelled. No completed charge
            was recorded{ref ? ` for booking ${ref}` : ''}.
          </p>

          {reservation && held && (
            <HoldRemainingNotice
              expiresAtMs={reservation.holdExpiresAt}
              serverNowMs={serverNowMs}
            />
          )}

          {reservation && !held && (
            <p className="text-small text-muted-foreground">
              {released
                ? 'The hold on this room has run out, so it may already be taken.'
                : 'This booking is already paid or waiting with us, so there is nothing to retry.'}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {recoveryHref && (
              <ButtonLink href={recoveryHref}>
                {retryHref ? 'Try payment again' : 'Check this booking'}
              </ButtonLink>
            )}
            <ButtonLink
              href={released ? searchAgainHref : '/rooms'}
              variant={recoveryHref ? 'secondary' : 'primary'}
            >
              {released ? 'Search these dates again' : 'Browse rooms'}
            </ButtonLink>
          </div>

          {reservation && (
            <p className="text-small text-muted-foreground">
              Card or USSD declined? On the payment step you can choose bank
              transfer instead, or pay at the hotel.
            </p>
          )}

          <p className="text-small text-muted-foreground">
            If your bank shows a pending charge, it will usually drop off within
            a few days. If you think you were charged in error,{' '}
            <TextLink href="/contact">contact us</TextLink>.
          </p>
        </div>
      </section>
    </CheckoutShell>
  );
}
