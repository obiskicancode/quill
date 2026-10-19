import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { Metadata } from 'next';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { ButtonLink } from '@/components/ui/Button';

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

  return (
    <CheckoutShell label="Secure checkout" backToHome>
      <section aria-labelledby="pf-title" className="container-page section-y">
        <div className="mx-auto max-w-xl space-y-5">
          <AlertTriangle className="size-10 text-danger" aria-hidden />
          <h1 id="pf-title" className="font-display text-h2">
            Payment not completed
          </h1>
          <p className="text-body-lg text-ink/85">
            The payment was not completed or was cancelled. Nothing has been
            charged.
          </p>
          {ref && (
            <p className="text-small text-muted">
              If you were in the middle of paying for booking{' '}
              <span className="font-semibold">{ref}</span>, try again from
              checkout.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/rooms">Browse rooms</ButtonLink>
            {ref ? (
              <ButtonLink
                href={`/checkout?ref=${encodeURIComponent(ref)}&return=1`}
                variant="secondary"
              >
                Try again
              </ButtonLink>
            ) : (
              <ButtonLink href="/enquiry" variant="secondary">
                Send us a booking enquiry
              </ButtonLink>
            )}
          </div>
          <p className="text-small text-muted">
            If your bank shows a pending charge, it will usually drop off within
            a few days. If you think you were charged in error,{' '}
            <Link
              href="/contact"
              className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
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
