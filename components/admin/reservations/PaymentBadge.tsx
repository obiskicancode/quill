import type { PaymentState } from '@/types/reservation.types';

const paymentConfig: Record<
  PaymentState,
  { label: string; className: string }
> = {
  fully_paid: {
    label: 'Fully paid',
    className: 'bg-success/10 text-success border-success/20',
  },
  deposit_paid: {
    label: 'Deposit paid',
    className: 'bg-accent/15 text-accent-ink border-accent/30',
  },
  unpaid: {
    label: 'Unpaid',
    className: 'bg-danger/10 text-danger border-danger/20',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-muted/15 text-muted border-muted/30',
  },
};

export function PaymentBadge({ state }: { state: PaymentState }) {
  const config = paymentConfig[state] ?? {
    label: state,
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
