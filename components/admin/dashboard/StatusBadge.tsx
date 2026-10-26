import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import type { ReservationStatus } from '@/types/dashboard.types';

const statusConfig: Record<
  ReservationStatus,
  { label: string; className: string }
> = {
  confirmed: {
    label: 'Confirmed',
    className: 'border-success/20 bg-success/10 text-success',
  },
  checked_in: {
    label: 'Checked in',
    className: 'border-primary/30 bg-primary/15 text-brand-ink',
  },
  checked_out: {
    label: 'Checked out',
    className: 'border-muted/30 bg-muted/15 text-muted-foreground',
  },
  pending: {
    label: 'Pending',
    className: 'border-line bg-ink/10 text-ink',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
  no_show: {
    label: 'No show',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
  expired: {
    label: 'Expired',
    className: 'border-muted/30 bg-muted/15 text-muted-foreground',
  },
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'border-line bg-ink/10 text-ink',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-caption rounded-full px-2 py-0.5 font-semibold',
        config.className,
      )}
    >
      {config.label}
    </Badge>
  );
}
