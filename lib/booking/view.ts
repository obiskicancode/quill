/**
 * Builds the guest-facing booking view from the stored reservation and the
 * caller's access level. Contact details are masked until the guest has proved
 * their email, and manage data is only added for a live manage session.
 */
import { cookies } from 'next/headers';

import { hotelClock, nightsBetween } from '@/lib/dates';
import { arrivalOptions } from '@/schemas/checkout.schema';
import type {
  GuestCancellation,
  GuestReservation,
  PaymentLabel,
} from '@/types/booking.types';
import type {
  CheckoutPendingRecovery,
  StatusResponse,
} from '@/types/checkout.types';

import { getCheckoutSettings } from '../checkout/settings';
import { formatGuestTime } from '../format';
import { buildManageData } from '../manage/data';
import {
  isActionableForCheckout,
  pendingReferencesFromAccessCookies,
} from './recovery';
import { getAccess, type AccessLevel } from './session';
import {
  loadStoredReservation,
  toStatus,
  type StoredReservation,
} from './store';

/** Masks the local part and domain host while keeping the TLD readable. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  const dot = domain.lastIndexOf('.');
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  const star = (s: string) =>
    s.length <= 1 ? s : s[0] + '*'.repeat(Math.min(s.length - 1, 6));
  return `${star(local)}@${star(host)}${tld}`;
}

/** Keeps the country code and last four digits of a phone number. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const country = phone.startsWith('+')
    ? `+${digits.slice(0, Math.max(1, digits.length - 10))}`
    : '';
  return `${country} ••• ••• ${digits.slice(-4)}`.trim();
}

function paymentLabel(r: StoredReservation): PaymentLabel {
  if (r.status === 'cancelled' && r.cancellation) {
    return r.cancellation.refundStatus === 'initiated'
      ? 'Refund started'
      : r.cancellation.refundStatus === 'pending_manual'
        ? 'Refund pending'
        : 'Cancelled';
  }
  const paidInFull = r.paidMinor >= r.totals.totalMinor && r.paidMinor > 0;
  switch (r.status) {
    case 'confirmed':
      return r.mode === 'deposit' && !paidInFull ? 'Deposit paid' : 'Paid';
    case 'checked_in':
    case 'checked_out':
    case 'no_show':
      return paidInFull
        ? 'Paid'
        : r.paidMinor > 0
          ? 'Deposit paid'
          : 'Pay at hotel';
    case 'pending_payment':
      return 'Awaiting confirmation';
    case 'awaiting_transfer':
    case 'awaiting_verification':
      return 'Awaiting verification';
    case 'pending_approval':
      return r.mode === 'pay_at_hotel'
        ? 'Pay at hotel'
        : r.paidMinor > 0
          ? r.mode === 'deposit'
            ? 'Deposit paid'
            : 'Paid'
          : 'Awaiting hotel approval';
    case 'reserved_pay_at_hotel':
      return 'Pay at hotel';
    default:
      return 'Not paid';
  }
}

/** Options that add manage-session data to the guest view. */
export interface ViewOptions {
  manage?: { csrf: string; expiresAt: number };
}

/** Snapshots taken before formatGuestTime existed store raw "14:00:00" inside the rule text; guests still read it as "2 pm". */
function formatEmbeddedTimes(text: string): string {
  return text.replace(/\b\d{2}:\d{2}(?::\d{2})?\b/g, (m) => formatGuestTime(m));
}

/**
 * Maps a stored reservation to the public booking shape, including masked
 * contact details, payment labels and optional manage actions.
 */
export async function buildGuestReservation(
  r: StoredReservation,
  level: AccessLevel,
  opts: ViewOptions = {},
): Promise<GuestReservation> {
  const verified = level === 'verified';
  const showFull = verified && !opts.manage;
  const snap = r.snapshot;
  const methodLabel =
    r.method === 'online'
      ? `Card or USSD (${snap.providerName})`
      : r.method === 'bank_transfer'
        ? 'Bank transfer'
        : 'Pay at the hotel';
  const c = r.cancellation;
  const cancellation: GuestCancellation | null = c
    ? {
        at: new Date(c.at).toISOString(),
        refundMinor: c.refund.refundMinor,
        retainedMinor: c.refund.retainedMinor,
        refundStatus: c.refundStatus,
        refundMethod: c.refund.refundMethod,
        timeline: c.refund.timeline,
      }
    : null;
  const settings =
    r.status === 'awaiting_transfer' ? await getCheckoutSettings() : null;

  return {
    reference: r.reference,
    status: r.status,
    paymentStatus: toStatus(r).paymentStatus,
    confirmationMode: r.confirmationMode,
    mode: r.mode,
    method: r.method,
    verified,
    stay: {
      checkIn: r.stay.checkIn || null,
      checkOut: r.stay.checkOut || null,
      nights:
        r.stay.checkIn && r.stay.checkOut
          ? nightsBetween(r.stay.checkIn, r.stay.checkOut)
          : 0,
      adults: r.stay.adults,
      children: r.stay.children,
    },
    room: snap.room,
    times: snap.times,
    breakdown: snap.breakdown,
    policy: {
      ...snap.policy,
      checkInRules: formatEmbeddedTimes(snap.policy.checkInRules),
      checkOutRules: formatEmbeddedTimes(snap.policy.checkOutRules),
    },
    hotel: snap.hotel,
    approvalResponse: snap.approvalResponse,
    addExtras: snap.addExtras,
    guest: {
      fullName: r.guest.fullName,
      email: showFull ? r.guest.email : maskEmail(r.guest.email),
      phone: showFull ? r.guest.phone : maskPhone(r.guest.phone),
      arrival:
        arrivalOptions.find((o) => o.value === r.guest.arrivalTime)?.label ??
        '',
      specialRequests: r.guest.specialRequests,
    },
    amounts: {
      totalMinor: r.totals.totalMinor,
      paidMinor: r.paidMinor,
      dueNowMinor: Math.max(0, r.totals.dueNowMinor - r.paidMinor),
      balanceMinor:
        r.status === 'cancelled'
          ? 0
          : Math.max(0, r.totals.totalMinor - r.paidMinor + r.refundedMinor),
    },
    payment: {
      label: paymentLabel(r),
      methodLabel,
      reference:
        r.paymentReference ??
        (r.method === 'bank_transfer' ? r.reference : null),
      paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
    },
    bank: settings
      ? { details: settings.bank, amountMinor: r.totals.dueNowMinor }
      : null,
    proofUploaded: r.proof !== null,
    holdExpiresAt: new Date(r.holdExpiresAt).toISOString(),
    serverTime: new Date().toISOString(),
    cancellation,
    ...(opts.manage
      ? { manage: await buildManageData(r, opts.manage, hotelClock()) }
      : {}),
  };
}

/** Loads a stored reservation by reference, or `null` when it does not exist. */
export async function loadReservation(
  reference: string,
): Promise<StoredReservation | null> {
  return loadStoredReservation(reference);
}

/**
 * The caller's own bookings that are still waiting on them, newest first.
 *
 * Every reference comes from a signed booking access cookie in this browser, is
 * re-checked against that cookie, and is reloaded from the database, so a guessed,
 * forged or another guest's reference can never appear here.
 */
export async function loadPendingReservations(): Promise<StoredReservation[]> {
  const jar = await cookies();
  const found: StoredReservation[] = [];
  for (const reference of pendingReferencesFromAccessCookies(jar.getAll())) {
    if (!(await getAccess(reference))) continue;
    const stored = await loadStoredReservation(reference);
    if (stored && isActionableForCheckout(stored)) found.push(stored);
  }
  return found.sort((a, b) => b.createdAt - a.createdAt);
}

/** The status payload used by the checkout poller and manage page. */
export const statusOf = (r: StoredReservation): StatusResponse => toStatus(r);

/**
 * What the checkout banner needs about a hold this browser still owns. The server
 * stamps its own clock so the countdown is not trusting the guest's device.
 */
export function pendingRecoveryFor(
  r: StoredReservation,
): CheckoutPendingRecovery {
  return {
    reference: r.reference,
    holdExpiresAtMs: r.holdExpiresAt,
    serverTimeMs: Date.now(),
    method: r.method,
  };
}

export type { StoredReservation };
