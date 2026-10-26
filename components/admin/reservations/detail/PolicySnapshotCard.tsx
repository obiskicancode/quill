import { ShieldCheck } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import type { ReservationPolicySnapshot } from '@/types/reservation.types';

export function PolicySnapshotCard({
  policy,
}: {
  policy: ReservationPolicySnapshot;
}) {
  const formattedDeadline = policy.freeCancellationUntil
    ? new Intl.DateTimeFormat('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(policy.freeCancellationUntil))
    : null;

  return (
    <AdminCard title="Policy snapshot">
      <div className="text-small space-y-3.5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck
            className="text-muted mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-ink font-semibold capitalize">
              {policy.cancellationPolicyType} policy
            </p>
            {formattedDeadline ? (
              <p className="text-caption text-muted">
                Free cancellation allowed until{' '}
                <strong className="text-ink">{formattedDeadline}</strong>.
              </p>
            ) : (
              <p className="text-caption text-muted">
                Non-refundable cancellation terms apply.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-control bg-paper/60 text-caption text-muted p-3">
          <p className="text-ink font-semibold">
            Check-in / Check-out schedule
          </p>
          <p className="mt-0.5">
            Check-in starts at {policy.checkInTime}. Check-out is required by{' '}
            {policy.checkOutTime}.
          </p>
        </div>

        {policy.houseRules && policy.houseRules.length > 0 && (
          <div className="border-line text-caption border-t pt-2">
            <span className="text-muted font-semibold uppercase">
              Property house rules
            </span>
            <ul className="text-muted mt-1.5 list-inside list-disc space-y-1">
              {policy.houseRules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
