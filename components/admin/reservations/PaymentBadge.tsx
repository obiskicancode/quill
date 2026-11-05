import { Badge } from '@/components/ui/badge';
import type { PaymentState } from '@/types/reservation.types';

const paymentConfig: Record<
  PaymentState,
  {
    label: string;
    variant: 'success' | 'brand' | 'destructive' | 'neutral';
  }
> = {
  fully_paid: { label: 'Fully paid', variant: 'success' },
  deposit_paid: { label: 'Deposit paid', variant: 'brand' },
  unpaid: { label: 'Unpaid', variant: 'destructive' },
  refunded: { label: 'Refunded', variant: 'neutral' },
};

export function PaymentBadge({ state }: { state: PaymentState }) {
  const config = paymentConfig[state] ?? {
    label: state,
    variant: 'neutral' as const,
  };

  return (
    <Badge variant={config.variant} className="font-semibold">
      {config.label}
    </Badge>
  );
}
