import { ERROR_MESSAGES } from '@/constants/error-messages';
import { fromISO, nightsBetween, toISO } from '@/lib/dates';
import type { ActionGate } from '@/types/base.types';
import type { PolicySnapshot } from '@/types/booking.types';
import type { PolicySummary } from '@/types/checkout.types';
import type { Clock, ISODate } from '@/types/dates.types';
import type {
  CancellationPreview,
  GuestAllowedActions,
  ManageSettings,
} from '@/types/manage.types';

import type { StoredReservation } from '../booking/store';
import { calculateRefund } from './refund';

/** Server-side rules for what a guest may do to a booking. Every mutation re-checks these. */

const CANCELLABLE = [
  'pending_payment',
  'awaiting_transfer',
  'awaiting_verification',
  'pending_approval',
  'reserved_pay_at_hotel',
  'confirmed',
];
const CHANGEABLE = ['confirmed', 'pending_approval', 'reserved_pay_at_hotel'];
const FINISHED = [
  'checked_out',
  'cancelled',
  'expired',
  'no_show',
  'payment_failed',
];
const EXTRAS_OK = [
  'confirmed',
  'pending_approval',
  'reserved_pay_at_hotel',
  'checked_in',
];

const yes: ActionGate = { allowed: true };
const no = (reason: string): ActionGate => ({ allowed: false, reason });

/** Minutes from hotel-local "now" until check-in time. Negative once check-in has passed. */
export function minutesUntilCheckIn(
  clock: Clock,
  checkIn: ISODate,
  time24: string,
): number {
  const [h, m] = time24.split(':').map(Number);
  return (
    nightsBetween(clock.today, checkIn) * 1440 + h * 60 + m - clock.minutes
  );
}

/** The free-cancellation deadline for a stay, using the rule saved on the booking (hours before check-in). */
export function freeDeadline(
  policy: Pick<PolicySnapshot, 'cancellation' | 'freeCancellationHours'>,
  checkIn: ISODate,
  checkIn24: string,
  clock: Clock,
): PolicySummary {
  if (policy.cancellation.nonRefundable)
    return {
      nonRefundable: true,
      freeCancellationUntil: null,
      note: 'Non-refundable',
    };
  if (policy.freeCancellationHours !== null) {
    const [h, m] = checkIn24.split(':').map(Number);
    const d = fromISO(checkIn);
    d.setHours(h, m, 0, 0);
    d.setTime(d.getTime() - policy.freeCancellationHours * 3_600_000);
    const date = toISO(d);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const passed =
      date < clock.today ||
      (date === clock.today &&
        d.getHours() * 60 + d.getMinutes() < clock.minutes);
    if (!passed)
      return {
        nonRefundable: false,
        freeCancellationUntil: { date, time },
        note: 'Free cancellation',
      };
  }
  return {
    nonRefundable: false,
    freeCancellationUntil: null,
    note: 'Cancellation charges apply. See the Cancellation Policy.',
  };
}

export function allowedActions(
  r: StoredReservation,
  clock: Clock,
  s: ManageSettings,
): GuestAllowedActions {
  const checkIn24 = r.snapshot.times.checkIn24;
  const until = r.stay.checkIn
    ? minutesUntilCheckIn(clock, r.stay.checkIn, checkIn24)
    : -1;

  const cancelReasons: Record<string, string> = {
    checked_in: ERROR_MESSAGES.ALREADY_CHECKED_IN_EARLY_LEAVE,
    checked_out: ERROR_MESSAGES.STAY_COMPLETE_NOTHING_TO_CANCEL,
    cancelled: ERROR_MESSAGES.BOOKING_ALREADY_CANCELLED,
    expired: ERROR_MESSAGES.BOOKING_EXPIRED_CANNOT_CANCEL,
    no_show: ERROR_MESSAGES.NO_SHOW_CANNOT_CANCEL_ONLINE,
    payment_failed: ERROR_MESSAGES.PAYMENT_FAILED_NOTHING_TO_CANCEL,
  };
  const canCancel = CANCELLABLE.includes(r.status)
    ? yes
    : no(
        cancelReasons[r.status] ?? ERROR_MESSAGES.BOOKING_CANNOT_CANCEL_ONLINE,
      );

  let canChangeDates: ActionGate;
  if (r.pendingChange)
    canChangeDates = no(ERROR_MESSAGES.DATE_CHANGE_AWAITING_PAYMENT);
  else if (FINISHED.includes(r.status) || r.status === 'checked_in')
    canChangeDates = no(ERROR_MESSAGES.CANNOT_CHANGE_DATES_ONLINE_STATUS);
  else if (!CHANGEABLE.includes(r.status))
    canChangeDates = no(ERROR_MESSAGES.CANNOT_CHANGE_DATES_PAYMENT_PENDING);
  else if (until <= 0) canChangeDates = no(ERROR_MESSAGES.CHECKIN_PASSED);
  else if (until < s.minNoticeHours * 60)
    canChangeDates = no(ERROR_MESSAGES.CHANGE_WINDOW(s.minNoticeHours));
  else if (r.changeCount >= s.maxChanges)
    canChangeDates = no(ERROR_MESSAGES.MAX_DATE_CHANGES(r.changeCount));
  else canChangeDates = yes;

  const canEditDetails = FINISHED.includes(r.status)
    ? no(ERROR_MESSAGES.DETAILS_CANNOT_EDIT_STATUS)
    : yes;
  const canAddExtras = !r.snapshot.addExtras.supported
    ? no(ERROR_MESSAGES.ADD_EXTRAS_NOT_OFFERED)
    : EXTRAS_OK.includes(r.status)
      ? yes
      : no(ERROR_MESSAGES.EXTRAS_CANNOT_ADD_STATUS);

  return {
    canCancel,
    canChangeDates,
    canEditDetails,
    canAddExtras,
    changesRemaining: Math.max(0, s.maxChanges - r.changeCount),
  };
}

/** First night's share of the total, tax and charges included. */
export function firstNightMinor(r: StoredReservation): number {
  const b = r.snapshot.breakdown;
  const first = b.lines[0]?.rateMinor ?? 0;
  return b.roomSubtotalMinor > 0
    ? Math.round((r.totals.totalMinor * first) / b.roomSubtotalMinor)
    : 0;
}

/** What cancelling right now would do. Uses the policy snapshot saved on the booking. */
export function previewCancellation(
  r: StoredReservation,
  clock: Clock,
  s: ManageSettings,
): CancellationPreview {
  const result = calculateRefund({
    policy: r.snapshot.policy,
    mode: r.mode,
    method: r.method,
    paidMinor: r.paidMinor,
    totalMinor: r.totals.totalMinor,
    firstNightMinor: firstNightMinor(r),
    clock,
    timelines: { original: s.refundTimeline, manual: s.manualRefundTimeline },
  });
  return {
    ...result,
    paidMinor: r.paidMinor,
    totalMinor: r.totals.totalMinor,
    evaluatedAt: new Date().toISOString(),
  };
}
