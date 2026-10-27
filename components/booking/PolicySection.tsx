import { formatDeadline, formatMinor } from '@/lib/format';
import type { GuestReservation } from '@/types/booking.types';
import type { CancellationPreview } from '@/types/manage.types';

import { TextLink } from '../ui/TextLink';

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
    <section
      aria-labelledby="policy-title"
      className="rounded-card border-line bg-card shadow-raised border p-5 md:p-6"
    >
      <h2 id="policy-title" className="font-display text-h3">
        Policies
      </h2>
      <p className="rounded-control bg-paper mt-4 p-4 font-semibold">
        {headline}
      </p>
      {c.freeCancellationUntil && (
        <p className="text-small text-muted-foreground mt-2">
          After that, cancellation charges apply.
        </p>
      )}
      {refundNow && (
        <div className="rounded-control border-line text-small mt-4 border p-4">
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
          <p className="text-ink/85 mt-2">{refundNow.rule}</p>
        </div>
      )}
      <dl className="text-small mt-5 space-y-3">
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
            <ul className="text-ink/85 mt-1 list-disc space-y-1 pl-5">
              {v.policy.houseRules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <ul className="mt-4 flex flex-wrap gap-x-6 print:hidden">
        <li>
          <TextLink href="/policies/cancellation-policy" external>
            Cancellation Policy
            <span className="sr-only"> (opens in a new tab)</span>
          </TextLink>
        </li>
        <li>
          <TextLink href="/policies/terms" external>
            Terms<span className="sr-only"> (opens in a new tab)</span>
          </TextLink>
        </li>
        <li>
          <TextLink href="/policies/privacy" external>
            Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
          </TextLink>
        </li>
      </ul>
    </section>
  );
}
