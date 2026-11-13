import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHECKOUT_ACTIONABLE_STATUSES,
  decideReplay,
  isActionableForCheckout,
  matchesRequestedStay,
  MAX_PENDING_RESERVATIONS,
  pendingReferencesFromAccessCookies,
  type RecoveryReservation,
} from '../lib/booking/recovery';
import { createAccessValue, readAccessValue } from '../lib/booking/session';
import {
  BOOKING_ACCESS_COOKIE_NAME,
  BOOKING_ACCESS_TTL_SECONDS,
} from '../lib/cookies/constants';

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 10, 1, 12, 0, 0);
const NOW_SECONDS = Math.floor(NOW / 1000);

const requested = {
  roomSlug: 'deluxe-double',
  checkIn: '2026-12-01',
  checkOut: '2026-12-03',
  adults: 2,
  children: 0,
  extraBed: false,
};

function held(
  overrides: Partial<RecoveryReservation> = {},
): RecoveryReservation {
  return {
    reference: 'AAA-111',
    status: 'pending_payment',
    mode: 'full',
    holdExpiresAt: NOW + 10 * MINUTE,
    createdAt: NOW,
    roomSlug: requested.roomSlug,
    stay: { ...requested },
    ...overrides,
  };
}

/** The cookie the server writes when a reservation is created. */
function accessCookie(reference: string, issuedAtSeconds = NOW_SECONDS) {
  return {
    name: BOOKING_ACCESS_COOKIE_NAME(reference),
    value: `${issuedAtSeconds + BOOKING_ACCESS_TTL_SECONDS}.c.signature`,
  };
}

const body = (reference: string) => ({ reference });

describe('A. the guest’s own hold must not block their own booking', () => {
  it('matches the stay the hold was taken for', () => {
    assert.equal(matchesRequestedStay(held(), requested), true);
  });

  it('only overlaps, so a stay that has already ended is not the guest’s problem', () => {
    assert.equal(
      matchesRequestedStay(
        held({
          stay: { ...requested, checkIn: '2026-11-28', checkOut: '2026-12-01' },
        }),
        requested,
      ),
      false,
      'back-to-back dates do not overlap',
    );
    assert.equal(
      matchesRequestedStay(
        held({
          stay: { ...requested, checkIn: '2026-12-02', checkOut: '2026-12-05' },
        }),
        requested,
      ),
      true,
    );
  });

  it('is room and guest specific', () => {
    assert.equal(
      matchesRequestedStay(held({ roomSlug: 'suite' }), requested),
      false,
    );
    assert.equal(
      matchesRequestedStay(
        held({ stay: { ...requested, adults: 3 } }),
        requested,
      ),
      false,
    );
    assert.equal(
      matchesRequestedStay(
        held({ stay: { ...requested, children: 1 } }),
        requested,
      ),
      false,
    );
  });

  it('offers only a hold that is still waiting on the guest', () => {
    assert.equal(isActionableForCheckout(held(), NOW), true);
    assert.equal(
      isActionableForCheckout(held({ status: 'awaiting_transfer' }), NOW),
      true,
    );
    assert.equal(
      isActionableForCheckout(held({ status: 'payment_failed' }), NOW),
      true,
    );
    for (const status of [
      'confirmed',
      'expired',
      'cancelled',
      'awaiting_verification',
      'pending_approval',
      'checked_in',
    ] as const) {
      assert.equal(
        isActionableForCheckout(held({ status }), NOW),
        false,
        `${status} is not something the guest can still act on`,
      );
    }
    assert.equal(
      isActionableForCheckout(held({ mode: 'pay_at_hotel' }), NOW),
      false,
      'nothing is owed on a pay-at-hotel booking',
    );
    assert.equal(
      isActionableForCheckout(held({ holdExpiresAt: NOW - 1 }), NOW),
      false,
      'a lapsed hold blocks nobody',
    );
  });

  it('cannot name another guest’s reservation, because the reference only arrives with its own signed cookie', () => {
    // The guest holds no cookie at all, so there is nothing to exclude.
    assert.deepEqual(pendingReferencesFromAccessCookies([], NOW_SECONDS), []);

    // A cookie signed for one reference does not authorize another.
    const value = createAccessValue('BBB-222', 'checkout');
    assert.equal(readAccessValue('BBB-222', value), 'checkout');
    assert.equal(readAccessValue('AAA-111', value), null);
  });
});

/**
 * The payment rows themselves need a Postgres session, so what is pinned here is the
 * rule the reuse is built on: exactly the statuses that may still be paid for, and
 * one list shared by recovery and `POST /api/payments/initialize`.
 */
describe('B. one status list decides what may still be paid', () => {
  it('is the set the guest can act on while the hold lives', () => {
    assert.deepEqual([...CHECKOUT_ACTIONABLE_STATUSES].sort(), [
      'awaiting_transfer',
      'payment_failed',
      'pending_payment',
    ]);
  });

  it('keeps a transferred booking payable, which is what hands it back on reload', () => {
    const transferred = held({ status: 'awaiting_transfer' });
    assert.equal(isActionableForCheckout(transferred, NOW), true);
    assert.equal(
      decideReplay(body(transferred.reference), transferred, NOW),
      'replay',
    );
  });
});

describe('C. a replayed create must not hand back a dead reservation', () => {
  it('replays while the hold is still live', () => {
    assert.equal(decideReplay(body('AAA-111'), held(), NOW), 'replay');
  });

  it('retires the reply once the hold has gone', () => {
    assert.equal(
      decideReplay(
        body('AAA-111'),
        held({ status: 'expired', holdExpiresAt: NOW - 5 * MINUTE }),
        NOW,
      ),
      'stale',
    );
    assert.equal(
      decideReplay(body('AAA-111'), held({ holdExpiresAt: NOW - 1 }), NOW),
      'stale',
      'a body must never outlive the room it claims to hold',
    );
    assert.equal(
      decideReplay(body('AAA-111'), held({ status: 'cancelled' }), NOW),
      'stale',
    );
  });

  it('retires a reply whose reservation is missing or not the one it names', () => {
    assert.equal(decideReplay(body('AAA-111'), null, NOW), 'stale');
    assert.equal(
      decideReplay(body('AAA-111'), held({ reference: 'ZZZ-999' }), NOW),
      'stale',
    );
    assert.equal(decideReplay({}, held(), NOW), 'stale');
    assert.equal(decideReplay(null, held(), NOW), 'stale');
  });

  it('still replays what the guest already achieved, rather than starting a second booking', () => {
    for (const state of [
      held({ status: 'confirmed', holdExpiresAt: NOW - 60 * MINUTE }),
      held({ status: 'awaiting_verification' }),
      held({ status: 'pending_approval' }),
      held({ mode: 'pay_at_hotel', status: 'reserved_pay_at_hotel' }),
    ]) {
      assert.equal(decideReplay(body('AAA-111'), state, NOW), 'replay');
    }
  });
});

describe('D. pending recovery is bounded, per reference and cookie-driven', () => {
  it('reads the guest’s booking cookies newest-first', () => {
    const references = pendingReferencesFromAccessCookies(
      [
        accessCookie('AAA-111', NOW_SECONDS - 400),
        accessCookie('BBB-222', NOW_SECONDS),
        accessCookie('CCC-333', NOW_SECONDS - 900),
      ],
      NOW_SECONDS,
    );
    assert.deepEqual(references, ['BBB-222', 'AAA-111', 'CCC-333']);
  });

  it('keeps every still-open booking instead of overwriting the earlier one', () => {
    const references = pendingReferencesFromAccessCookies(
      [accessCookie('AAA-111'), accessCookie('BBB-222')],
      NOW_SECONDS,
    );
    assert.equal(references.includes('AAA-111'), true);
    assert.equal(references.includes('BBB-222'), true);
  });

  it('caps the set and drops the oldest pointers', () => {
    const cookies = Array.from(
      { length: MAX_PENDING_RESERVATIONS + 3 },
      (_, i) =>
        accessCookie(`REF-${String(i).padStart(3, '0')}`, NOW_SECONDS - i * 60),
    );
    const references = pendingReferencesFromAccessCookies(cookies, NOW_SECONDS);
    assert.equal(references.length, MAX_PENDING_RESERVATIONS);
    assert.deepEqual(references, [
      'REF-000',
      'REF-001',
      'REF-002',
      'REF-003',
      'REF-004',
    ]);
  });

  it('ignores names that are not a booking cookie', () => {
    const references = pendingReferencesFromAccessCookies(
      [
        { name: 'quill_mg_AAA-111', value: `${NOW_SECONDS + 600}.signature` },
        { name: 'quill_bk_short', value: `${NOW_SECONDS + 600}.c.sig` },
        { name: 'quill_bk_has space', value: `${NOW_SECONDS + 600}.c.sig` },
        { name: 'quill_bk_', value: `${NOW_SECONDS + 600}.c.sig` },
        { name: 'not_a_booking_cookie', value: `${NOW_SECONDS + 600}.c.sig` },
        accessCookie('BBB-222'),
      ],
      NOW_SECONDS,
    );
    assert.deepEqual(references, ['BBB-222']);
  });

  it('ignores cookies whose value is missing, unparseable or already expired', () => {
    const references = pendingReferencesFromAccessCookies(
      [
        { name: BOOKING_ACCESS_COOKIE_NAME('AAA-111') },
        { name: BOOKING_ACCESS_COOKIE_NAME('BBB-222'), value: 'garbage' },
        accessCookie('CCC-333', NOW_SECONDS - 7200),
        accessCookie('DDD-444'),
      ],
      NOW_SECONDS,
    );
    assert.deepEqual(references, ['DDD-444']);
  });

  it('is deterministic when two cookies were issued in the same second', () => {
    const first = pendingReferencesFromAccessCookies(
      [accessCookie('ZZZ-999'), accessCookie('AAA-111')],
      NOW_SECONDS,
    );
    const second = pendingReferencesFromAccessCookies(
      [accessCookie('AAA-111'), accessCookie('ZZZ-999')],
      NOW_SECONDS,
    );
    assert.deepEqual(first, second);
    assert.deepEqual(first, ['AAA-111', 'ZZZ-999']);
  });
});
