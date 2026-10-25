import type { Metadata } from 'next';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { ManageGate } from '@/components/manage/ManageGate';
import { getManageSession } from '@/lib/booking/session';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { manageOpts } from '@/lib/manage/auth';
import { referenceSchema } from '@/schemas/booking.schema';
import type { GuestReservation } from '@/types/booking.types';

import '../confirmation/print.css';

// No personal data may be cached or indexed.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Manage your booking',
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const get = (name: string): string | null => {
    const v = sp[name];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };

  // ?ref= only pre-fills the lookup form. Only a live session cookie opens a booking.
  const parsed = referenceSchema.safeParse(get('ref') ?? '');
  const reference = parsed.success ? parsed.data : '';

  let initial: GuestReservation | null = null;
  if (reference && (await getManageSession(reference))) {
    const stored = await loadReservation(reference);
    const opts = await manageOpts(reference);
    if (stored && opts)
      initial = await buildGuestReservation(stored, 'verified', {
        manage: opts,
      });
  }

  return (
    <CheckoutShell label="Manage booking" backToHome>
      <ManageGate initial={initial} reference={reference} notice={undefined} />
    </CheckoutShell>
  );
}
