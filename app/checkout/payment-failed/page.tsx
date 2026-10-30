import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { Metadata } from 'next';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { ButtonLink } from '@/components/ui/button';
import { loadReservation } from '@/lib/booking/view';

export const metadata: Metadata = {
  title: 'Payment not completed',
  robots: { index: false, follow: false },
};

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
  const reservation = ref ? await loadReservation(ref) : null;
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
    : ref
      ? `/booking/manage?ref=${encodeURIComponent(ref)}`
      : null;

  return (
    <CheckoutShell label="Secure checkout" backToHome>
      <section aria-labelledby="pf-title" className="container-page section-y">
        <div className="mx-auto max-w-xl space-y-5">
          <AlertTriangle className="text-destructive size-10" aria-hidden />
          <h1 id="pf-title" className="font-display text-h2">
            Payment not completed
          </h1>
          <p className="text-body-lg text-ink/85">
            The payment was not completed or was cancelled. No completed charge
            was recorded for this booking.
          </p>
          {ref && (
            <p className="text-small text-muted-foreground">
              If you were in the middle of paying for booking{' '}
              <span className="font-semibold">{ref}</span>, try again from
              checkout.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/rooms">Browse rooms</ButtonLink>
            {retryHref ? (
              <ButtonLink href={retryHref} variant="secondary">
                Try again
              </ButtonLink>
            ) : (
              <ButtonLink href="/enquiry" variant="secondary">
                Send us a booking enquiry
              </ButtonLink>
            )}
          </div>
          <p className="text-small text-muted-foreground">
            If your bank shows a pending charge, it will usually drop off within
            a few days. If you think you were charged in error,{' '}
            <Link
              href="/contact"
              className="decoration-brand font-semibold underline decoration-2 underline-offset-4"
            >
              contact us
            </Link>
            .
          </p>
        </div>
      </section>
    </CheckoutShell>
  );
}
