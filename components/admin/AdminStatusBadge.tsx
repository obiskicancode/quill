import type { ReactNode } from 'react';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  AdminReservationStatus,
  PaymentState,
} from '@/types/reservation.types';
import type { StaffStatus } from '@/types/staff.types';

/**
 * The admin tone vocabulary. Every status chip in the admin UI is one of these
 * six meanings, so the same word never paints a different colour in two places:
 *
 * - `success` — settled and good
 * - `brand` — live and in progress
 * - `warning` — needs an operator action
 * - `destructive` — closed badly or blocked
 * - `neutral` — inert, ended or withdrawn
 * - `info` — unrecognised value, kept readable rather than wrong
 */
export type StatusTone = Extract<
  BadgeVariant,
  'success' | 'brand' | 'warning' | 'destructive' | 'neutral' | 'info'
>;

const dotClass: Record<StatusTone, string> = {
  success: 'bg-success',
  brand: 'bg-primary',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  neutral: 'bg-muted',
  info: 'bg-ink/40',
};

/**
 * A status label with an optional leading colour dot. The dot and the tint come
 * from one `tone`, so a row can never paint a green pill with a grey dot.
 */
export function AdminStatusBadge({
  tone,
  dot = false,
  className,
  children,
}: {
  tone: StatusTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Badge
      variant={tone}
      className={cn('font-semibold', dot && 'gap-1.5 px-2.5', className)}
    >
      {dot && (
        <span
          aria-hidden
          className={cn('size-1.5 shrink-0 rounded-full', dotClass[tone])}
        />
      )}
      {children}
    </Badge>
  );
}

/**
 * Reads a stored status key the way an operator reads it: `no_show` becomes
 * "No show". Labels come from the value itself so a chip can never disagree
 * with the data it was built from.
 */
export function statusLabel(value: string): string {
  const words = value.split('_').join(' ').trim();
  if (words.length === 0) return value;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const reservationTones: Record<AdminReservationStatus, StatusTone> = {
  confirmed: 'success',
  pending: 'brand',
  checked_in: 'brand',
  checked_out: 'neutral',
  cancelled: 'destructive',
  no_show: 'destructive',
  expired: 'neutral',
};

export function reservationTone(
  status: AdminReservationStatus | string,
): StatusTone {
  return reservationTones[status as AdminReservationStatus] ?? 'info';
}

const paymentStateTones: Record<PaymentState, StatusTone> = {
  fully_paid: 'success',
  deposit_paid: 'brand',
  unpaid: 'destructive',
  refunded: 'neutral',
};

export function paymentStateTone(state: PaymentState | string): StatusTone {
  return paymentStateTones[state as PaymentState] ?? 'info';
}

const paymentRecordTones: Record<string, StatusTone> = {
  paid: 'success',
  pending: 'brand',
  failed: 'destructive',
  refunded: 'neutral',
};

/**
 * A payment record can carry a provider status the app has never seen, so the
 * caller passes a string and unknown values fall back to `info`.
 */
export function paymentRecordTone(status: string): StatusTone {
  return paymentRecordTones[status] ?? 'info';
}

const staffStatusTones: Record<StaffStatus, StatusTone> = {
  active: 'success',
  invited: 'brand',
  locked: 'destructive',
  deactivated: 'neutral',
};

export function staffStatusTone(status: StaffStatus): StatusTone {
  return staffStatusTones[status] ?? 'info';
}
