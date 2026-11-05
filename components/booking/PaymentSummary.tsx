import { TextLink } from '@/components/ui/text-link';
import { formatMinor } from '@/lib/format';
import type { GuestReservation } from '@/types/booking.types';

import { PriceBreakdown } from '../room-detail/PriceBreakdown';
import { Badge } from '../rooms/AvailabilityBadge';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';

/** The full breakdown plus amount paid, balance, method and reference. Wording follows the real status. */
export function PaymentSummary({ v }: { v: GuestReservation }) {
  const { amounts, payment } = v;
  const good = payment.label === 'Paid' || payment.label === 'Deposit paid';
  const row = 'flex justify-between gap-4';
  return (
    <Card
      render={<section aria-labelledby="payment-title" />}
      className="text-body [--card-spacing:--spacing(5)] md:[--card-spacing:--spacing(6)]"
    >
      <CardHeader>
        <CardTitle
          id="payment-title"
          render={<h2 />}
          className="font-display text-h3"
        >
          Payment
        </CardTitle>
        <CardAction>
          <Badge tone={good ? 'accent' : 'neutral'}>{payment.label}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <PriceBreakdown quote={v.breakdown} />
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-small">
          <div className={row}>
            <dt className="text-muted-foreground">Amount paid</dt>
            <dd className="font-semibold tabular-nums">
              {formatMinor(amounts.paidMinor)}
            </dd>
          </div>
          {amounts.balanceMinor > 0 && (
            <div className={row}>
              <dt className="text-muted-foreground">
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
            <dt className="text-muted-foreground">Payment method</dt>
            <dd>{payment.methodLabel}</dd>
          </div>
          {payment.reference && (
            <div className={row}>
              <dt className="text-muted-foreground">Payment reference</dt>
              <dd className="break-all tabular-nums">{payment.reference}</dd>
            </div>
          )}
        </dl>
      </CardContent>
      <CardFooter className="border-0 bg-transparent pt-0 print:hidden">
        <TextLink
          href={`/booking/confirmation/receipt?ref=${encodeURIComponent(v.reference)}`}
          external
        >
          Download receipt
          <span className="sr-only">
            {' '}
            (opens a print-friendly page in a new tab)
          </span>
        </TextLink>
      </CardFooter>
    </Card>
  );
}
