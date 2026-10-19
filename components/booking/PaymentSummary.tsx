import Link from 'next/link';

import type { GuestReservation } from '@/types/booking.types';
import { formatMinor } from '@/types/stay.types';

import { PriceBreakdown } from '../room-detail/PriceBreakdown';
import { Badge } from '../rooms/AvailabilityBadge';

/** The full breakdown plus amount paid, balance, method and reference. Wording follows the real status. */
export function PaymentSummary({ v }: { v: GuestReservation }) {
  const { amounts, payment } = v;
  const good = payment.label === 'Paid' || payment.label === 'Deposit paid';
  const row = 'flex justify-between gap-4';
  return (
    <section
      aria-labelledby="payment-title"
      className="space-y-5 rounded-card border border-line bg-surface p-5 shadow-raised md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="payment-title" className="font-display text-h3">
          Payment
        </h2>
        <Badge tone={good ? 'accent' : 'neutral'}>{payment.label}</Badge>
      </div>
      <PriceBreakdown quote={v.breakdown} />
      <dl className="space-y-2 border-t border-line pt-4 text-small">
        <div className={row}>
          <dt className="text-muted">Amount paid</dt>
          <dd className="font-semibold tabular-nums">
            {formatMinor(amounts.paidMinor)}
          </dd>
        </div>
        {amounts.balanceMinor > 0 && (
          <div className={row}>
            <dt className="text-muted">
              {v.status === 'confirmed' ||
              v.status === 'reserved_pay_at_hotel' ||
              v.status === 'pending_approval'
                ? 'Balance due at the hotel'
                : 'Amount still to pay'}
            </dt>
            <dd className="font-semibold tabular-nums">
              {formatMinor(amounts.balanceMinor)}
            </dd>
          </div>
        )}
        <div className={row}>
          <dt className="text-muted">Payment method</dt>
          <dd>{payment.methodLabel}</dd>
        </div>
        {payment.reference && (
          <div className={row}>
            <dt className="text-muted">Payment reference</dt>
            <dd className="break-all tabular-nums">{payment.reference}</dd>
          </div>
        )}
      </dl>
      <p className="print:hidden">
        <Link
          href={`/booking/confirmation/receipt?ref=${encodeURIComponent(v.reference)}`}
          target="_blank"
          className="inline-flex min-h-11 items-center font-semibold underline decoration-accent decoration-2 underline-offset-4"
        >
          Download receipt
          <span className="sr-only">
            {' '}
            (opens a print-friendly page in a new tab)
          </span>
        </Link>
      </p>
    </section>
  );
}
