import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { detailsPatchSchema } from '@/schemas/checkout.schema';
import type { CancelRequest, DetailsRequest } from '@/schemas/manage.schema';
import type { CheckoutBreakdown } from '@/types/checkout.types';
import type { Clock, ISODate } from '@/types/dates.types';
import type {
  CancellationPreview,
  ChangeQuoteResponse,
  PendingChange,
  PriceDifference,
  RefundRecord,
  RefundStatus,
} from '@/types/manage.types';
import type { StayInput, Violation } from '@/types/stay.types';

import {
  applyStayChange,
  deleteStoredQuote,
  getStoredQuote,
  logEvent,
  newId,
  notify,
  saveQuote,
  saveStoredReservation,
  type StoredReservation,
} from '../booking/store';
import { buildCheckoutQuote } from '../checkout/quote';
import { nightsBetween } from '../dates';
import { getPaymentProvider, isPaymentProviderId } from '../payments';
import { formatRange } from '../rooms';
import { getPricingSettings, getRoomDetail } from '../rooms/detail';
import { validateStay } from '../rooms/pricing';
import { allowedActions, freeDeadline, previewCancellation } from './rules';
import { getManageSettings } from './settings';

/** Server actions for managing a booking. Every one re-checks the rules, writes the status history and audit log, and queues guest notifications. */

// ---------------------------------------------------------------- cancel
export type CancelOutcome =
  | { status: 'cancelled' }
  | { status: 'not_allowed'; reason: string }
  | { status: 'preview_changed'; preview: CancellationPreview };

export async function cancelBooking(
  r: StoredReservation,
  req: CancelRequest,
  clock: Clock,
): Promise<CancelOutcome> {
  const settings = await getManageSettings();
  const allowed = allowedActions(r, clock, settings).canCancel;
  if (!allowed.allowed)
    return {
      status: 'not_allowed',
      reason: allowed.reason ?? ERROR_MESSAGES.CANNOT_CANCEL_ONLINE,
    };

  const preview = previewCancellation(r, clock, settings);
  if (preview.refundMinor !== req.expectedRefundMinor)
    return { status: 'preview_changed', preview };

  let refundStatus: RefundStatus =
    preview.refundMinor > 0
      ? preview.refundMethod === 'manual_bank'
        ? 'pending_manual'
        : 'initiated'
      : 'none';
  if (
    refundStatus === 'initiated' &&
    r.paymentReference &&
    (!r.paymentProvider ||
      !isPaymentProviderId(r.paymentProvider) ||
      !(await getPaymentProvider(r.paymentProvider).refund({
        reference: r.paymentReference,
        amountMinor: preview.refundMinor,
      })))
  )
    refundStatus = 'pending_manual';
  r.status = 'cancelled';
  r.pendingChange = null;
  r.cancellation = {
    at: Date.now(),
    reason: req.reason ?? null,
    note: req.note ?? null,
    refund: preview,
    refundStatus,
  };
  logEvent(r, 'cancelled', undefined, 'guest');

  if (preview.refundMinor > 0) {
    const record: RefundRecord = {
      id: newId(),
      at: Date.now(),
      amountMinor: preview.refundMinor,
      method: preview.refundMethod,
      status: refundStatus,
    };
    r.refunds.push(record);
    // Refunds that the provider cannot process become a manual task for staff.
    logEvent(
      r,
      refundStatus === 'pending_manual'
        ? 'refund_pending_manual'
        : 'refund_initiated',
      undefined,
      'system',
    );
  }
  notify(r, 'booking_cancelled', SUCCESS_MESSAGES.CANCELLATION_CONFIRMED_EMAIL);
  await saveStoredReservation(r);
  return { status: 'cancelled' };
}

// ---------------------------------------------------------------- edit details
export type DetailsOutcome =
  { status: 'saved' } | { status: 'not_allowed'; reason: string };

export async function saveDetails(
  r: StoredReservation,
  patch: DetailsRequest['details'],
  clock: Clock,
): Promise<DetailsOutcome> {
  const allowed = allowedActions(
    r,
    clock,
    await getManageSettings(),
  ).canEditDetails;
  if (!allowed.allowed)
    return {
      status: 'not_allowed',
      reason: allowed.reason ?? ERROR_MESSAGES.DETAILS_CANNOT_EDIT,
    };
  const parsed = detailsPatchSchema.parse(patch);
  r.guest = { ...r.guest, ...parsed };
  logEvent(
    r,
    'details_changed',
    'Name, phone, country, arrival time or requests',
    'guest',
  );
  notify(r, 'details_changed', SUCCESS_MESSAGES.DETAILS_CHANGES_EMAILED);
  await saveStoredReservation(r);
  return { status: 'saved' };
}

// ---------------------------------------------------------------- change dates
const sameDates = (r: StoredReservation, a: ISODate, b: ISODate) =>
  r.stay.checkIn === a && r.stay.checkOut === b;

export async function quoteChange(
  r: StoredReservation,
  req: { checkIn: ISODate; checkOut: ISODate },
  clock: Clock,
): Promise<ChangeQuoteResponse> {
  const settings = await getManageSettings();
  const allowed = allowedActions(r, clock, settings).canChangeDates;
  if (!allowed.allowed)
    return {
      status: 'not_allowed',
      reason: allowed.reason ?? ERROR_MESSAGES.DATES_CANNOT_CHANGE_ONLINE,
    };

  const room = await getRoomDetail(r.roomSlug);
  const hotelSettings = await getPricingSettings();
  if (!room)
    return {
      status: 'not_allowed',
      reason: ERROR_MESSAGES.ROOM_CANNOT_CHANGE_ONLINE,
    };

  const violations: Violation[] = [];
  if (sameDates(r, req.checkIn, req.checkOut))
    violations.push({
      code: ERROR_CODES.MIN_NIGHTS,
      message: ERROR_MESSAGES.CURRENT_DATES,
    });
  else {
    const stay: StayInput & { checkIn: ISODate; checkOut: ISODate } = {
      ...req,
      adults: r.stay.adults,
      children: r.stay.children,
      extraBed: r.stay.extraBed,
    };
    violations.push(...validateStay(room, hotelSettings, stay, clock));
  }
  if (violations.length > 0) return { status: 'rule', violations };

  const q = await buildCheckoutQuote({
    room: r.roomSlug,
    ...req,
    adults: r.stay.adults,
    children: r.stay.children,
    extraBed: r.stay.extraBed,
    extras: r.extras,
  });
  const roomReassigned = false;
  if (q.status === 'unavailable')
    return { status: 'unavailable', suggestions: q.suggestions };
  if (q.status === 'invalid')
    return {
      status: 'rule',
      violations: [{ code: ERROR_CODES.MIN_NIGHTS, message: q.message }],
    };

  const oldTotal = r.totals.totalMinor;
  const newTotal = q.breakdown.totalMinor;
  const diff = newTotal - oldTotal;
  const settle: 'now' | 'at_hotel' =
    r.mode === 'full' && r.paidMinor > 0 ? 'now' : 'at_hotel';
  const manual = r.method === 'bank_transfer';
  const difference: PriceDifference =
    diff > 0
      ? { kind: 'pay', amountMinor: diff, settle }
      : diff < 0
        ? {
            kind: 'refund',
            amountMinor: -diff,
            settle,
            refundMethod:
              settle === 'now'
                ? manual
                  ? 'manual_bank'
                  : 'original_payment'
                : 'none',
            timeline:
              settle === 'now'
                ? manual
                  ? settings.manualRefundTimeline
                  : settings.refundTimeline
                : null,
          }
        : { kind: 'none', amountMinor: 0, settle };

  const policy = freeDeadline(
    r.snapshot.policy,
    req.checkIn,
    r.snapshot.times.checkIn24,
    clock,
  );
  const stored = {
    id: newId(),
    reference: r.reference,
    ...req,
    breakdown: q.breakdown,
    oldTotalMinor: oldTotal,
    newTotalMinor: newTotal,
    settle,
    roomReassigned,
    policy,
    expiresAt: Date.now() + settings.quoteTtlMinutes * 60_000,
  };
  await saveQuote(stored);

  return {
    status: 'ok',
    quoteId: stored.id,
    expiresAt: new Date(stored.expiresAt).toISOString(),
    ...req,
    nights: nightsBetween(req.checkIn, req.checkOut),
    breakdown: q.breakdown,
    oldTotalMinor: oldTotal,
    newTotalMinor: newTotal,
    difference,
    roomReassigned,
    newPolicy: {
      nonRefundable: policy.nonRefundable,
      freeCancellationUntil: policy.freeCancellationUntil,
    },
    holdSeconds: settings.holdSeconds,
  };
}

export type CommitOutcome =
  | { status: 'completed' }
  | { status: 'payment_required' }
  | { status: 'stale'; quote: ChangeQuoteResponse }
  | { status: 'not_allowed'; reason: string };

export async function commitChange(
  r: StoredReservation,
  quoteId: string,
  clock: Clock,
): Promise<CommitOutcome> {
  const settings = await getManageSettings();
  const quoteRow = await getStoredQuote(quoteId);
  const stored = quoteRow
    ? {
        id: quoteRow.id,
        reference: quoteRow.reference,
        checkIn: quoteRow.checkIn,
        checkOut: quoteRow.checkOut,
        breakdown: quoteRow.breakdown as unknown as CheckoutBreakdown,
        oldTotalMinor: quoteRow.oldTotalMinor,
        newTotalMinor: quoteRow.newTotalMinor,
        settle: quoteRow.settle as 'now' | 'at_hotel',
        roomReassigned: quoteRow.roomReassigned,
        policy: quoteRow.policy as unknown as PendingChange['policy'],
        expiresAt: quoteRow.expiresAt.getTime(),
      }
    : null;
  if (
    !stored ||
    stored.reference !== r.reference ||
    stored.expiresAt < Date.now()
  ) {
    return {
      status: 'stale',
      quote: {
        status: 'not_allowed',
        reason: ERROR_MESSAGES.QUOTE_EXPIRED,
      },
    };
  }
  // Re-check everything: rules, availability and price. The client's numbers are never trusted.
  const fresh = await quoteChange(
    r,
    { checkIn: stored.checkIn, checkOut: stored.checkOut },
    clock,
  );
  if (fresh.status === 'not_allowed')
    return { status: 'not_allowed', reason: fresh.reason };
  if (fresh.status !== 'ok' || fresh.newTotalMinor !== stored.newTotalMinor)
    return { status: 'stale', quote: fresh };

  const diff = stored.newTotalMinor - stored.oldTotalMinor;
  if (diff > 0 && stored.settle === 'now') {
    const pending: PendingChange = {
      changeId: newId(),
      checkIn: stored.checkIn,
      checkOut: stored.checkOut,
      breakdown: stored.breakdown,
      totalMinor: stored.newTotalMinor,
      amountDueMinor: diff,
      holdExpiresAt: Date.now() + settings.holdSeconds * 1000,
      method: null,
      status: 'awaiting_payment',
      roomReassigned: stored.roomReassigned,
      policy: stored.policy,
    };
    r.pendingChange = pending;
    logEvent(
      r,
      'change_requested',
      `New dates ${formatRange(stored.checkIn, stored.checkOut)} are held while you pay.`,
      'guest',
    );
    await saveStoredReservation(r);
    return { status: 'payment_required' };
  }

  const refund = diff < 0 && stored.settle === 'now' ? -diff : 0;
  applyStayChange(r, {
    checkIn: stored.checkIn,
    checkOut: stored.checkOut,
    breakdown: stored.breakdown,
    totalMinor: stored.newTotalMinor,
    paidDeltaMinor: -refund,
    policy: stored.policy,
  });
  if (refund > 0) {
    const manual = r.method === 'bank_transfer';
    r.refunds.push({
      id: newId(),
      at: Date.now(),
      amountMinor: refund,
      method: manual ? 'manual_bank' : 'original_payment',
      status: manual ? 'pending_manual' : 'initiated',
    });
    logEvent(
      r,
      manual ? 'refund_pending_manual' : 'refund_initiated',
      'Difference for your new dates',
    );
  }
  notify(r, 'dates_changed', SUCCESS_MESSAGES.UPDATED_BOOKING_EMAILED);
  await saveStoredReservation(r);
  await deleteStoredQuote(quoteId);
  return { status: 'completed' };
}
