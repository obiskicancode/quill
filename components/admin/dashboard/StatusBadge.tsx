import type { ReservationStatus } from '@/types/dashboard.types';

const statusConfig: Record<
  ReservationStatus,
  { label: string; className: string }
> = {
  confirmed: {
    label: 'Confirmed',
    className: 'bg-success/10 text-success border-success/20',
  },
  checked_in: {
    label: 'Checked in',
    className: 'bg-accent/15 text-accent-ink border-accent/30',
  },
  checked_out: {
    label: 'Checked out',
    className: 'bg-muted/15 text-muted border-muted/30',
  },
  pending: {
    label: 'Pending',
    className: 'bg-ink/10 text-ink border-line',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-danger/10 text-danger border-danger/20',
  },
  no_show: {
    label: 'No show',
    className: 'bg-danger/10 text-danger border-danger/20',
  },
  expired: {
    label: 'Expired',
    className: 'bg-muted/15 text-muted border-muted/30',
  },
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-ink/10 text-ink border-line',
  };

  return (
    <span
      className={`text-caption inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
