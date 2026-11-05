import { Badge } from '@/components/ui/badge';
import type { AdminReservationStatus } from '@/types/reservation.types';

const statusConfig: Record<
  AdminReservationStatus,
  {
    label: string;
    variant: 'success' | 'brand' | 'neutral' | 'info' | 'destructive';
  }
> = {
  confirmed: { label: 'Confirmed', variant: 'success' },
  checked_in: { label: 'Checked in', variant: 'brand' },
  checked_out: { label: 'Checked out', variant: 'neutral' },
  pending: { label: 'Pending', variant: 'info' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  no_show: { label: 'No show', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'neutral' },
};

export function StatusBadge({ status }: { status: AdminReservationStatus }) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: 'info' as const,
  };

  return (
    <Badge variant={config.variant} className="font-semibold">
      {config.label}
    </Badge>
  );
}
