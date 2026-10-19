import { detailsPatchSchema } from '@/schemas/checkout.schema';
import type { CancelRequest, DetailsRequest } from '@/schemas/manage.schema';
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
  logEvent,
  newId,
  notify,
  store,
  type StoredQuote,
  type StoredReservation,
} from '../checkout/mock-db';
import { buildCheckoutQuote } from '../checkout/quote';
import { parseDemos } from '../checkout/settings';
import { nightsBetween, type ISODate } from '../dates';
import { getRoomDetail, hotelSettings } from '../room-detail';
import { formatRange } from '../room-query';
import { validateStay, type Clock } from '../stay-quote';
import { allowedActions, freeDeadline, previewCancellation } from './rules';
import { getManageSettings } from './settings';

/**
 * MOCK server actions for managing a booking. Every one re-checks the rules, writes the status history and audit log,
 * emails the guest and alerts the hotel. Refunds are only ever initiated here through the provider (mock) or queued for staff.
 */

const demosOf = (r: StoredReservation, extra: Set<string>) =>
  new Set([...parseDemos(r.demo), ...extra]);

// ---------------------------------------------------------------- cancel
export type CancelOutcome =
  | { status: 'cancelled' }
  | { status: 'not_allowed'; reason: string }
  | { status: 'preview_changed'; preview: CancellationPreview };

export function cancelBooking(
  r: StoredReservation,
  req: CancelRequest,
  clock: Clock,
  extraDemos: Set<string>,
): CancelOutcome {
  const settings = getManageSettings(demosOf(r, extraDemos));
  const allowed = allowedActions(r, clock, settings).canCancel;
  if (!allowed.allowed)
    return {
      status: 'not_allowed',
      reason: allowed.reason ?? 'This booking cannot be cancelled online.',
    };

  const preview = previewCancellation(r, clock, settings);
  if (preview.refundMinor !== req.expectedRefundMinor)
    return { status: 'preview_changed', preview };

  const refundStatus: RefundStatus =
    preview.refundMinor > 0
      ? preview.refundMethod === 'manual_bank'
        ? 'pending_manual'
        : 'initiated'
      : 'none';
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
      id: newId('rf'),
      at: Date.now(),
      amountMinor: preview.refundMinor,
      method: preview.refundMethod,
      status: refundStatus,
    };
    r.refunds.push(record);
    // Online refunds go to the payment provider's refund API (mock). Bank transfers become a manual task for staff.
    logEvent(
      r,
      refundStatus === 'pending_manual'
        ? 'refund_pending_manual'
        : 'refund_initiated',
      undefined,
      'system',
    );
  }
  notify(r, 'booking_cancelled', 'Your cancellation was confirmed by email.');
  return { status: 'cancelled' };
}

// ---------------------------------------------------------------- edit details
export type DetailsOutcome =
  { status: 'saved' } | { status: 'not_allowed'; reason: string };

export function saveDetails(
  r: StoredReservation,
  patch: DetailsRequest['details'],
  clock: Clock,
  extraDemos: Set<string>,
): DetailsOutcome {
  const allowed = allowedActions(
    r,
    clock,
    getManageSettings(demosOf(r, extraDemos)),
  ).canEditDetails;
  if (!allowed.allowed)
    return {
      status: 'not_allowed',
      reason: allowed.reason ?? 'Details cannot be edited.',
    };
  const parsed = detailsPatchSchema.parse(patch);
  r.guest = { ...r.guest, ...parsed };
  logEvent(
    r,
    'details_changed',
    'Name, phone, country, arrival time or requests',
    'guest',
  );
  notify(r, 'details_changed', 'A summary of your changes was emailed to you.');
  return { status: 'saved' };
}

// ---------------------------------------------------------------- change dates
const sameDates = (r: StoredReservation, a: ISODate, b: ISODate) =>
  r.stay.checkIn === a && r.stay.checkOut === b;

export async function quoteChange(
  r: StoredReservation,
  req: { checkIn: ISODate; checkOut: ISODate },
  clock: Clock,
  extraDemos: Set<string>,
): Promise<ChangeQuoteResponse> {
  const demos = demosOf(r, extraDemos);
  const settings = getManageSettings(demos);
  const allowed = allowedActions(r, clock, settings).canChangeDates;
  if (!allowed.allowed)
    return {
      status: 'not_allowed',
      reason: allowed.reason ?? "Dates can't be changed online.",
    };

  const room = getRoomDetail(r.roomSlug);
  if (!room)
    return {
      status: 'not_allowed',
      reason: "This room can't be changed online.",
    };

  const violations: Violation[] = [];
  if (sameDates(r, req.checkIn, req.checkOut))
    violations.push({
      code: 'min-nights',
      message: 'Those are your current dates. Choose different dates.',
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

  const run = (demo: string) =>
    buildCheckoutQuote({
      room: r.roomSlug,
      ...req,
      adults: r.stay.adults,
      children: r.stay.children,
      extraBed: r.stay.extraBed,
      extras: r.extras,
      demo,
    });
  const base = [...demos]
    .filter((d) => d !== 'unavailable' && d !== 'changed')
    .join(',');
  let q = await run(`${base},${demos.has('unavailable') ? 'unavailable' : ''}`);
  let roomReassigned = false;
  if (q.status === 'unavailable' && demos.has('reassign')) {
    // The same room is taken but another room of the same type is free: assign it silently and tell the guest.
    q = await run(`${base},avail`);
    roomReassigned = true;
  }
  if (q.status === 'unavailable')
    return { status: 'unavailable', suggestions: q.suggestions };
  if (q.status === 'invalid')
    return {
      status: 'rule',
      violations: [{ code: 'min-nights', message: q.message }],
    };

  const oldTotal = r.totals.totalMinor;
  const newTotal = q.breakdown.totalMinor;
  const diff = newTotal - oldTotal;
  const settle = r.mode === 'full' && r.paidMinor > 0 ? 'now' : 'at_hotel';
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
  const stored: StoredQuote = {
    id: newId('q'),
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
  store.quotes.set(stored.id, stored);

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
  extraDemos: Set<string>,
): Promise<CommitOutcome> {
  const settings = getManageSettings(demosOf(r, extraDemos));
  const stored = store.quotes.get(quoteId);
  if (
    !stored ||
    stored.reference !== r.reference ||
    stored.expiresAt < Date.now()
  ) {
    return {
      status: 'stale',
      quote: {
        status: 'not_allowed',
        reason: 'That quote has expired. Choose your dates again.',
      },
    };
  }
  // Re-check everything: rules, availability and price. The client's numbers are never trusted.
  const fresh = await quoteChange(
    r,
    { checkIn: stored.checkIn, checkOut: stored.checkOut },
    clock,
    extraDemos,
  );
  if (fresh.status === 'not_allowed')
    return { status: 'not_allowed', reason: fresh.reason };
  if (fresh.status !== 'ok' || fresh.newTotalMinor !== stored.newTotalMinor)
    return { status: 'stale', quote: fresh };

  const diff = stored.newTotalMinor - stored.oldTotalMinor;
  if (diff > 0 && stored.settle === 'now') {
    const pending: PendingChange = {
      changeId: newId('chg'),
      checkIn: stored.checkIn,
      checkOut: stored.checkOut,
      breakdown: stored.breakdown,
      totalMinor: stored.newTotalMinor,
      amountDueMinor: diff,
      holdExpiresAt: Date.now() + settings.holdSeconds * 1000,
      method: null,
      status: 'awaiting_payment',
      payment: null,
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
      id: newId('rf'),
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
  notify(r, 'dates_changed', 'Your updated booking was emailed to you.');
  return { status: 'completed' };
}
