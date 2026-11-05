import { Badge, type BadgeVariant } from '@/components/ui/badge';
import type { PaymentListItem } from '@/types/payments.types';

const statusVariant: Record<PaymentListItem['status'], BadgeVariant> = {
  paid: 'success',
  pending: 'brand',
  failed: 'destructive',
  refunded: 'neutral',
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant={statusVariant[status as PaymentListItem['status']] ?? 'info'}
      className={className}
    >
      {status}
    </Badge>
  );
}
