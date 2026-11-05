import { ShieldCheck } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatHotelDateTime } from '@/lib/format';
import type { ReservationPolicySnapshot } from '@/types/reservation.types';

export function PolicySnapshotCard({
  policy,
}: {
  policy: ReservationPolicySnapshot;
}) {
  const formattedDeadline = policy.freeCancellationUntil
    ? formatHotelDateTime(policy.freeCancellationUntil)
    : null;

  return (
    <AdminCard title="Policy snapshot">
      <div className="space-y-3.5 text-small">
        <div className="flex items-start gap-2.5">
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-ink capitalize">
              {policy.cancellationPolicyType} policy
            </p>
            {formattedDeadline ? (
              <p className="text-caption text-muted-foreground">
                Free cancellation allowed until{' '}
                <strong className="text-ink">{formattedDeadline}</strong>.
              </p>
            ) : (
              <p className="text-caption text-muted-foreground">
                Non-refundable cancellation terms apply.
              </p>
            )}
          </div>
        </div>

        <Alert variant="neutral" size="panel">
          <AlertTitle>Check-in / Check-out schedule</AlertTitle>
          <AlertDescription>
            Check-in starts at {policy.checkInTime}. Check-out is required by{' '}
            {policy.checkOutTime}.
          </AlertDescription>
        </Alert>

        {policy.houseRules && policy.houseRules.length > 0 && (
          <div className="border-t border-line pt-2 text-caption">
            <span className="font-semibold text-muted-foreground uppercase">
              Property house rules
            </span>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
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
