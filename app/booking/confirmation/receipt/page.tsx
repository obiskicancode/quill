import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { PrintReceiptButton } from '@/components/booking/PrintReceiptButton';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { PriceBreakdown } from '@/components/room-detail/PriceBreakdown';
import { getAccess } from '@/lib/booking/session';
import { buildGuestReservation, loadReservation } from '@/lib/booking/view';
import { formatDayMonthYear, hotelClock } from '@/lib/dates';
import { formatMinor, pluralCount } from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import { referenceSchema } from '@/schemas/booking.schema';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Receipt',
  robots: { index: false, follow: false },
};

/** A print-friendly receipt. Opens in a new tab; guests use Print or Save as PDF. */
export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.ref) ? sp.ref[0] : sp.ref;
  const parsed = referenceSchema.safeParse(raw ?? '');
  if (!parsed.success) redirect('/booking/confirmation');
  const reference = parsed.data;
  const level = await getAccess(reference);
  const stored = level ? await loadReservation(reference) : null;
  if (!level || !stored)
    redirect(`/booking/confirmation?ref=${encodeURIComponent(reference)}`);
  const v = await buildGuestReservation(stored, level);
  const row = 'flex justify-between gap-6 border-b border-line py-2';
  // A receipt is issued when the money moves, not when the page happens to open.
  const issuedOn = v.payment.paidAt
    ? formatDayMonthYear(hotelClock(new Date(v.payment.paidAt)).today)
    : null;

  return (
    <CheckoutShell label="Receipt" backToHome>
      <div className="receipt-page container-page max-w-2xl py-8 md:py-12">
        <article
          className="receipt-doc space-y-6 rounded-card border border-line bg-card p-6 md:p-8"
          aria-label="Receipt"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
            <div>
              <h1 className="font-display text-h2">Receipt</h1>
              <p className="mt-1 font-semibold">{v.hotel.name}</p>
              <p className="text-small text-muted-foreground">
                {v.hotel.addressLines.join(', ')}
              </p>
            </div>
            <div className="text-right text-small">
              <p className="text-muted-foreground">Booking reference</p>
              <p className="font-display text-h3">{v.reference}</p>
              {issuedOn && (
                <p className="mt-1 text-muted-foreground">Issued {issuedOn}</p>
              )}
            </div>
          </div>

          <section aria-labelledby="receipt-booking-title">
            <h2
              id="receipt-booking-title"
              className="text-small font-semibold tracking-wide text-muted-foreground uppercase"
            >
              Booking details
            </h2>
            <dl className="mt-2 text-small">
              <div className={row}>
                <dt>Guest</dt>
                <dd>{v.guest.fullName}</dd>
              </div>
              <div className={row}>
                <dt>Room</dt>
                <dd>{v.room.name}</dd>
              </div>
              <div className={row}>
                <dt>Stay</dt>
                <dd>
                  {v.stay.checkIn && v.stay.checkOut
                    ? `${formatRange(v.stay.checkIn, v.stay.checkOut)} (${pluralCount(v.stay.nights, 'night')})`
                    : 'To be confirmed'}
                </dd>
              </div>
              <div className={row}>
                <dt>Status</dt>
                <dd className="font-semibold">{v.payment.label}</dd>
              </div>
            </dl>
          </section>

          <PriceBreakdown quote={v.breakdown} />

          <section aria-labelledby="receipt-payment-title">
            <h2
              id="receipt-payment-title"
              className="text-small font-semibold tracking-wide text-muted-foreground uppercase"
            >
              Payment
            </h2>
            <dl className="mt-2 text-small">
              <div className={row}>
                <dt>Amount paid</dt>
                <dd className="font-semibold tabular-nums">
                  {formatMinor(v.amounts.paidMinor)}
                </dd>
              </div>
              {v.amounts.balanceMinor > 0 && (
                <div className={row}>
                  <dt>Balance due at the hotel</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatMinor(v.amounts.balanceMinor)}
                  </dd>
                </div>
              )}
              <div className={row}>
                <dt>Payment method</dt>
                <dd>{v.payment.methodLabel}</dd>
              </div>
              {v.payment.reference && (
                <div className={row}>
                  <dt>Payment reference</dt>
                  <dd className="tabular-nums">{v.payment.reference}</dd>
                </div>
              )}
            </dl>
          </section>
        </article>
        <div className="mt-6 flex justify-center">
          <PrintReceiptButton />
        </div>
      </div>
    </CheckoutShell>
  );
}
