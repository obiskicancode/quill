import {
  BOOKING_ACCESS_COOKIE_PREFIX,
  BOOKING_ACCESS_TTL_SECONDS,
} from '@/lib/cookies/constants';
import { referenceSchema } from '@/schemas/booking.schema';
import type { GuestReservationStatus } from '@/types/checkout.types';

import type { StoredReservation } from './store';

/**
 * Recovery for a guest who left checkout while a room was still held.
 *
 * A reference is only a pointer, never a credential: every candidate has to pass
 * the signed per-reference booking access cookie and is reloaded from the
 * database before it is offered to anyone.
 */

export const MAX_PENDING_RESERVATIONS = 5;

/** The guest still has something to do before the hold runs out. */
export const CHECKOUT_ACTIONABLE_STATUSES: readonly GuestReservationStatus[] = [
  'pending_payment',
  'awaiting_transfer',
  'payment_failed',
];

/** The booking is finished from the guest's point of view. */
const DEAD_STATUSES: readonly GuestReservationStatus[] = [
  'expired',
  'cancelled',
  'no_show',
];

/** The fields recovery reads, so callers can pass a projection or a full row. */
export type RecoveryReservation = Pick<
  StoredReservation,
  | 'reference'
  | 'status'
  | 'mode'
  | 'holdExpiresAt'
  | 'createdAt'
  | 'roomSlug'
  | 'stay'
>;

export interface StayIdentity {
  roomSlug: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}

/** `[checkIn, checkOut)` date ranges, compared as the ISO strings the columns hold. */
export function stayOverlaps(
  a: { checkIn: string; checkOut: string },
  b: { checkIn: string; checkOut: string },
): boolean {
  return a.checkIn < b.checkOut && b.checkIn < a.checkOut;
}

export function matchesRequestedStay(
  r: Pick<RecoveryReservation, 'roomSlug' | 'stay'>,
  requested: StayIdentity,
): boolean {
  return (
    r.roomSlug === requested.roomSlug &&
    r.stay.adults === requested.adults &&
    r.stay.children === requested.children &&
    stayOverlaps(r.stay, requested)
  );
}

/** Still waiting on this guest, right now, for a booking that needs paying. */
export function isActionableForCheckout(
  r: Pick<RecoveryReservation, 'status' | 'mode' | 'holdExpiresAt'>,
  now = Date.now(),
): boolean {
  if (r.mode === 'pay_at_hotel') return false;
  return (
    CHECKOUT_ACTIONABLE_STATUSES.includes(r.status) && r.holdExpiresAt > now
  );
}

/**
 * The guest's `dea_bk_<REF>` access cookies are the pointer set: nothing else is
 * remembered. References are validated by format only here — the signature check
 * and the database load happen where the cookie is actually read.
 *
 * Ordered newest-first: the signed expiry is the issue time plus a fixed TTL, so
 * a later expiry means a later booking and wins when several candidates match.
 */
export function pendingReferencesFromAccessCookies(
  entries: readonly { name: string; value?: string }[],
  nowSeconds = Math.floor(Date.now() / 1000),
): string[] {
  const candidates: { reference: string; issuedAt: number }[] = [];
  for (const entry of entries) {
    if (!entry.name.startsWith(BOOKING_ACCESS_COOKIE_PREFIX)) continue;
    const parsed = referenceSchema.safeParse(
      entry.name.slice(BOOKING_ACCESS_COOKIE_PREFIX.length),
    );
    if (!parsed.success) continue;
    const expiresAt = Number(entry.value?.split('.')[0]);
    if (!Number.isInteger(expiresAt) || expiresAt <= nowSeconds) continue;
    candidates.push({
      reference: parsed.data,
      issuedAt: expiresAt - BOOKING_ACCESS_TTL_SECONDS,
    });
  }
  candidates.sort(
    (a, b) => b.issuedAt - a.issuedAt || a.reference.localeCompare(b.reference),
  );
  return candidates.slice(0, MAX_PENDING_RESERVATIONS).map((c) => c.reference);
}

export type ReplayDecision = 'replay' | 'stale';

/**
 * A finished reservation outlives its hold: the idempotency record lasts an hour,
 * the hold fifteen minutes. Replaying a dead reservation would send the guest back
 * to the form with a reference that can no longer be paid, so it is retired instead
 * and the same request creates a fresh booking. Anything the guest already achieved
 * (paid, awaiting approval or awaiting verification) still replays, because starting
 * a second booking on top of it would be worse.
 */
export function decideReplay(
  response: unknown,
  stored: RecoveryReservation | null,
  now = Date.now(),
): ReplayDecision {
  const reference = (response as { reference?: unknown } | null)?.reference;
  if (typeof reference !== 'string') return 'stale';
  if (!stored || stored.reference !== reference) return 'stale';
  if (DEAD_STATUSES.includes(stored.status)) return 'stale';
  // The read already flips a lapsed hold to `expired`; a replay body must still
  // never outlive the room it claims to hold.
  if (
    CHECKOUT_ACTIONABLE_STATUSES.includes(stored.status) &&
    stored.holdExpiresAt <= now
  )
    return 'stale';
  return 'replay';
}
