import type { PolicySnapshot } from '@/types/booking.types';
import type { PaymentMethod, PaymentMode } from '@/types/checkout.types';
import type { RefundResult } from '@/types/manage.types';

import { formatDeadline } from '../checkout/format';
import type { ISODate } from '../dates';

/**
 * The one refund calculation. It runs only on the server, from the policy snapshot saved on the reservation
 * (never the hotel's current settings), and the browser only displays what it returns.
 */
export interface RefundInput {
  policy: Pick<PolicySnapshot, 'cancellation' | 'afterDeadline'>;
  mode: PaymentMode;
  method: PaymentMethod | null;
  paidMinor: number;
  totalMinor: number;
  /** The first night's share of the total, tax and charges included. Used by the "first night is kept" rule. */
  firstNightMinor: number;
  /** Hotel-local date and minutes since midnight. */
  clock: { today: ISODate; minutes: number };
  timelines: { original: string; manual: string };
}

const roundToNaira = (minor: number) => Math.round(minor / 100) * 100;
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function calculateRefund(i: RefundInput): RefundResult {
  const paid = Math.max(0, i.paidMinor);
  const none = {
    refundMinor: 0,
    retainedMinor: 0,
    refundMethod: 'none' as const,
    timeline: null,
  };

  if (paid === 0) {
    return i.mode === 'pay_at_hotel'
      ? {
          kind: 'pay_at_hotel',
          ...none,
          rule: 'You have not paid anything online, so there is nothing to refund and nothing is charged.',
        }
      : {
          kind: 'unpaid',
          ...none,
          rule: 'No payment has been received yet, so there is nothing to refund and nothing is charged.',
        };
  }

  const c = i.policy.cancellation;
  const free = c.freeCancellationUntil;
  const inFreeWindow =
    !c.nonRefundable &&
    free !== null &&
    (i.clock.today < free.date ||
      (i.clock.today === free.date && i.clock.minutes <= toMinutes(free.time)));

  let retained: number;
  let rule: string;
  if (c.nonRefundable) {
    retained = paid;
    rule = 'This booking is non-refundable.';
  } else if (inFreeWindow && free) {
    retained = 0;
    rule = `Free cancellation applies until ${formatDeadline(free)}.`;
  } else {
    const after = i.policy.afterDeadline;
    if (after.kind === 'first_night') {
      retained = Math.min(paid, roundToNaira(i.firstNightMinor));
      rule =
        'The free cancellation window has ended, so the first night is kept.';
    } else if (after.kind === 'percent') {
      retained = Math.min(
        paid,
        roundToNaira((i.totalMinor * after.percent) / 100),
      );
      rule = `The free cancellation window has ended, so ${after.percent}% of the stay is kept.`;
    } else {
      retained = paid;
      rule = 'The free cancellation window has ended, so nothing is refunded.';
    }
  }

  const refund = paid - retained;
  const manual = i.method === 'bank_transfer';
  const kind =
    manual && refund > 0
      ? 'bank_transfer'
      : i.mode === 'deposit'
        ? 'deposit_only'
        : retained > 0 && refund === 0
          ? 'non_refundable'
          : retained > 0
            ? 'partial'
            : 'free';

  return {
    kind,
    refundMinor: refund,
    retainedMinor: retained,
    rule,
    refundMethod:
      refund > 0 ? (manual ? 'manual_bank' : 'original_payment') : 'none',
    timeline:
      refund > 0 ? (manual ? i.timelines.manual : i.timelines.original) : null,
  };
}
