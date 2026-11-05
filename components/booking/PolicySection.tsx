import { Alert, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';
import { formatDeadline, formatMinor } from '@/lib/format';
import type { GuestReservation } from '@/types/booking.types';
import type { CancellationPreview } from '@/types/manage.types';

/** Shows the policy snapshot saved on the reservation, never the hotel's current settings. */
export function PolicySection({
  v,
  refundNow,
}: {
  v: GuestReservation;
  /** Manage page: what cancelling right now would do. */ refundNow?: CancellationPreview | null;
}) {
  const c = v.policy.cancellation;
  const headline = c.nonRefundable
    ? 'Non-refundable'
    : c.freeCancellationUntil
      ? `Free cancellation until ${formatDeadline(c.freeCancellationUntil)}`
      : c.note;
  return (
    <Card
      render={<section aria-labelledby="policy-title" />}
      className="text-body [--card-spacing:--spacing(5)] md:[--card-spacing:--spacing(6)]"
    >
      <CardHeader>
        <CardTitle
          id="policy-title"
          render={<h2 />}
          className="font-display text-h3"
        >
          Policies
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="neutral" size="panel">
          <AlertTitle>{headline}</AlertTitle>
        </Alert>
        {c.freeCancellationUntil && (
          <p className="mt-2 text-small text-muted-foreground">
            After that, cancellation charges apply.
          </p>
        )}
        {refundNow && (
          <div className="mt-4 rounded-control border border-line p-4 text-small">
            <p className="font-semibold">If you cancelled right now</p>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">You would get back</dt>
                <dd className="font-semibold tabular-nums">
                  {formatMinor(refundNow.refundMinor)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">The hotel would keep</dt>
                <dd className="tabular-nums">
                  {formatMinor(refundNow.retainedMinor)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-ink/85">{refundNow.rule}</p>
          </div>
        )}
        <dl className="mt-5 space-y-3 text-small">
          <div>
            <dt className="font-semibold">Check-in</dt>
            <dd className="text-ink/85">{v.policy.checkInRules}</dd>
          </div>
          <div>
            <dt className="font-semibold">Check-out</dt>
            <dd className="text-ink/85">{v.policy.checkOutRules}</dd>
          </div>
          <div>
            <dt className="font-semibold">House rules</dt>
            <dd>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ink/85">
                {v.policy.houseRules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="border-0 bg-transparent pt-0 print:hidden">
        <ul className="flex flex-wrap gap-x-6">
          <li>
            <TextLink href="/policies/cancellation-policy">
              Cancellation Policy
            </TextLink>
          </li>
          <li>
            <TextLink href="/policies/terms">Terms</TextLink>
          </li>
          <li>
            <TextLink href="/policies/privacy">Privacy Policy</TextLink>
          </li>
        </ul>
      </CardFooter>
    </Card>
  );
}
