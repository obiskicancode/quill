import type { Metadata } from 'next';

import { ConfirmationGate } from '@/components/booking/ConfirmationGate';
import type { VerifyVariant } from '@/components/booking/VerifyForm';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { getAccess } from '@/lib/booking/session';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { referenceSchema } from '@/schemas/booking.schema';
import type { GuestReservation } from '@/types/booking.types';

import './print.css';

// No personal data may be cached or indexed.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your booking',
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const get = (name: string): string | null => {
    const v = sp[name];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };

  const parsed = referenceSchema.safeParse(get('ref') ?? '');
  const reference = parsed.success ? parsed.data : null;

  let initial: GuestReservation | null = null;
  let variant: VerifyVariant = 'verify';

  if (!reference) {
    variant = 'missing';
  } else {
    // The cookie was set at checkout. Without it (another device, or later) the guest verifies with the email used.
    // An unknown reference and a missing cookie look identical, so references cannot be probed.
    const level = await getAccess(reference);
    const stored = level ? await loadReservation(reference) : null;
    if (level && stored) initial = await buildGuestReservation(stored, level);
  }

  return (
    <CheckoutShell label="Your booking" backToHome>
      <ConfirmationGate
        initial={initial}
        reference={reference ?? ''}
        variant={variant}
      />
    </CheckoutShell>
  );
}
