import type { PolicySettings } from '@/types/content.types';

const policyTypeLabels: Record<
  PolicySettings['cancellation']['policyType'],
  string
> = {
  flexible: 'Free cancellation within the window',
  moderate: 'Free cancellation within the window',
  non_refundable: 'Non-refundable rate',
  custom: 'See the terms below',
};

/** Structured cancellation facts pulled from the hotel's settings, so this page can never disagree with checkout. */
export function CancellationSummary({
  policy,
  checkInTime,
  checkOutTime,
}: {
  policy: PolicySettings['cancellation'];
  checkInTime: string;
  checkOutTime: string;
}) {
  const rows: { term: string; detail: string | null }[] = [
    {
      term: 'Free cancellation',
      detail:
        policy.freeCancellationHours === null
          ? 'This rate does not include free cancellation.'
          : `Free cancellation up to ${policy.freeCancellationHours} hours before your arrival.`,
    },
    {
      term: 'After the free window',
      detail:
        policy.refundPercentAfterWindow === 0
          ? 'No refund after the free window.'
          : `${policy.refundPercentAfterWindow}% of the stay is refunded.`,
    },
    {
      term: 'Refund timing',
      detail:
        policy.refundTimelineDays === null
          ? null
          : `Approved refunds usually reach your card within ${policy.refundTimelineDays} working days.`,
    },
    { term: 'If you do not arrive', detail: policy.noShowPolicy },
  ];

  return (
    <section
      aria-labelledby="cancel-summary-title"
      className="rounded-card border-line bg-surface shadow-raised border p-5 md:p-6"
    >
      <h2 id="cancel-summary-title" className="font-display text-h3">
        The short version
      </h2>
      <p className="rounded-control bg-paper mt-3 p-4 font-semibold">
        {policyTypeLabels[policy.policyType]}
      </p>
      <p className="text-small text-ink/85 mt-2">
        The cancellation terms shown on your booking when you booked always
        apply to that booking.
      </p>
      <dl className="text-small mt-5 space-y-3">
        {rows
          .filter((r): r is { term: string; detail: string } =>
            Boolean(r.detail),
          )
          .map((r) => (
            <div
              key={r.term}
              className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-6"
            >
              <dt className="font-semibold">{r.term}</dt>
              <dd className="text-ink/85">{r.detail}</dd>
            </div>
          ))}
        <div className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="font-semibold">Check-in</dt>
          <dd className="text-ink/85">From {checkInTime}</dd>
        </div>
        <div className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="font-semibold">Check-out</dt>
          <dd className="text-ink/85">By {checkOutTime}</dd>
        </div>
      </dl>
    </section>
  );
}

/** Structured house rules, merged from the settings. Empty rows are left out. */
export function HouseRulesList({
  policy,
}: {
  policy: PolicySettings['houseRules'];
}) {
  const rows: { term: string; detail: string | null }[] = [
    { term: 'Check-in', detail: `From ${policy.checkInTime}` },
    { term: 'Check-out', detail: `By ${policy.checkOutTime}` },
    { term: 'Children', detail: policy.childrenPolicy },
    {
      term: 'Pets',
      detail: policy.petsAllowed
        ? policy.petsNote || 'Pets are welcome.'
        : policy.petsNote || 'Pets are not allowed.',
    },
    { term: 'Smoking', detail: policy.smokingNote },
    {
      term: 'ID at check-in',
      detail: policy.idRequiredAtCheckin
        ? 'A valid government-issued photo ID is required for every adult at check-in.'
        : null,
    },
    { term: 'Quiet hours', detail: policy.quietHours },
    { term: 'Visitors', detail: policy.visitorsNote },
    { term: 'Damages', detail: policy.damagesNote },
  ];

  return (
    <dl className="divide-line border-line mt-5 divide-y border-y">
      {rows
        .filter((r): r is { term: string; detail: string } => Boolean(r.detail))
        .map((r) => (
          <div
            key={r.term}
            className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6"
          >
            <dt className="font-semibold">{r.term}</dt>
            <dd className="text-ink/85">{r.detail}</dd>
          </div>
        ))}
    </dl>
  );
}
