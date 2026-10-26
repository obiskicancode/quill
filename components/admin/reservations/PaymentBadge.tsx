import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import type { PaymentState } from '@/types/reservation.types';

const paymentConfig: Record<
  PaymentState,
  { label: string; className: string }
> = {
  fully_paid: {
    label: 'Fully paid',
    className: 'border-success/20 bg-success/10 text-success',
  },
  deposit_paid: {
    label: 'Deposit paid',
    className: 'border-primary/30 bg-primary/15 text-brand-ink',
  },
  unpaid: {
    label: 'Unpaid',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
  refunded: {
    label: 'Refunded',
    className: 'border-muted/30 bg-muted/15 text-muted-foreground',
  },
};

export function PaymentBadge({ state }: { state: PaymentState }) {
  const config = paymentConfig[state] ?? {
    label: state,
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
