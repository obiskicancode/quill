import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import type { QueryExecutor } from '../lib/booking/store';
import type { CheckoutQuoteOk } from '../types/checkout.types';

process.env.DATABASE_URL ||=
  'postgresql://postgres:postgres@localhost:5432/checkout_hold_update_test';

type StoreModule = typeof import('../lib/booking/store');
type SchemaModule = typeof import('../schemas/checkout.schema');

let store!: StoreModule;
let schema!: SchemaModule;

before(async () => {
  store = await import('../lib/booking/store');
  schema = await import('../schemas/checkout.schema');
});

function queuedExecutor(queue: unknown[][]) {
  const calls: string[] = [];
  let index = 0;

  const builder = (name: string, rows: unknown[]) => {
    const proxy: unknown = new Proxy(function () {}, {
      get(_target, property) {
        if (property === 'then')
          return (resolve: (value: unknown) => void) => resolve(rows);
        return (...args: unknown[]) => {
          void args;
          calls.push(`${name}.${String(property)}`);
          return proxy;
        };
      },
      apply() {
        return proxy;
      },
    });
    return proxy;
  };

  return {
    calls,
    select: () => {
      calls.push('select');
      return builder('select', queue[index++] ?? []);
    },
    insert: () => {
      calls.push('insert');
      return builder('insert', []);
    },
    update: () => {
      calls.push('update');
      return builder('update', []);
    },
    delete: () => {
      calls.push('delete');
      return builder('delete', []);
    },
    execute: async () => [],
  };
}

function rawReservation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'res-1',
    roomId: 'room-1',
    roomTypeId: 'type-1',
    reference: 'DEL-123',
    guestName: 'Ada Example',
    guestEmail: 'ada@example.com',
    guestPhone: '+2348000000000',
    guestCountry: 'NG',
    arrivalTime: '12-14',
    specialRequests: '',
    checkIn: '2026-12-01',
    checkOut: '2026-12-03',
    adults: 2,
    children: 0,
    nights: 2,
    status: 'pending',
    paymentMode: 'deposit',
    confirmationMode: 'instant',
    subtotalMinor: 100_000,
    extrasMinor: 0,
    discountMinor: 0,
    taxMinor: 0,
    serviceChargeMinor: 0,
    totalMinor: 100_000,
    depositRequiredMinor: 20_000,
    amountPaidMinor: 0,
    amountRefundedMinor: 0,
    balanceMinor: 100_000,
    holdExpiresAt: new Date(Date.now() + 15 * 60_000),
    termsAcceptedAt: new Date(),
    createdAt: new Date(),
    changeCount: 0,
    snapshot: {
      breakdown: {
        roomSubtotalMinor: 100_000,
        extraBed: null,
        extras: [],
        discount: null,
        taxMinor: 0,
        serviceChargeMinor: 0,
        totalMinor: 100_000,
      },
    },
    ...overrides,
  };
}

function quote(overrides: Partial<CheckoutQuoteOk> = {}): CheckoutQuoteOk {
  return {
    status: 'ok',
    breakdown: {
      roomSubtotalMinor: 100_000,
      extraBed: null,
      extras: [
        {
          id: 'breakfast',
          name: 'Breakfast',
          quantity: 2,
          unitLabel: 'per guest',
          totalMinor: 10_000,
        },
      ],
      discount: null,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 110_000,
    },
    payment: {
      mode: 'deposit',
      totalMinor: 110_000,
      dueNowMinor: 22_000,
      balanceAtHotelMinor: 88_000,
      acceptedMethods: ['online', 'bank_transfer'],
      provider: 'paystack',
    },
    policy: {
      nonRefundable: false,
      freeCancellationUntil: null,
      note: 'Free cancellation',
    },
    confirmationMode: 'instant',
    holdSeconds: 900,
    extrasCatalog: [],
    extraBed: {
      needed: false,
      available: false,
      priceMinor: null,
      selected: false,
    },
    priceChange: null,
    serverTime: new Date().toISOString(),
    ...overrides,
  } as CheckoutQuoteOk;
}

describe('checkout hold update', () => {
  it('accepts editable guest details and normalises the phone', () => {
    const parsed = schema.holdUpdateSchema.safeParse({
      guest: {
        fullName: 'Ada Example',
        email: 'ADA@Example.com',
        country: 'NG',
        phone: '0803 123 4567',
        arrivalTime: '12-14',
        specialRequests: '',
      },
      extraBed: false,
      extras: [{ id: 'breakfast', quantity: 2 }],
      expectedTotalMinor: 110_000,
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.guest.phone, '+2348031234567');
    assert.equal(parsed.data.guest.email, 'ada@example.com');
  });

  it('rejects an invalid extra quantity before touching the hold', () => {
    const parsed = schema.holdUpdateSchema.safeParse({
      guest: {
        fullName: 'Ada Example',
        email: 'ada@example.com',
        country: 'NG',
        phone: '+2348031234567',
        arrivalTime: '12-14',
        specialRequests: '',
      },
      extraBed: false,
      extras: [{ id: 'breakfast', quantity: 11 }],
      expectedTotalMinor: 110_000,
    });

    assert.equal(parsed.success, false);
  });

  it('restores stored extras as catalog slugs', async () => {
    const executor = queuedExecutor([
      [rawReservation()],
      [{ id: 'type-1', slug: 'deluxe-double' }],
      [{ name: 'Breakfast', quantity: 2, slug: 'breakfast' }],
      [],
      [],
      [],
      [],
    ]);

    const stored = await store.loadStoredReservation(
      'DEL-123',
      executor as unknown as QueryExecutor,
    );

    assert.deepEqual(stored?.extras, [{ id: 'breakfast', quantity: 2 }]);
  });

  it('restores legacy extras whose extra_id is missing by matching the name', async () => {
    const executor = queuedExecutor([
      [rawReservation()],
      [{ id: 'type-1', slug: 'deluxe-double' }],
      [{ name: 'Breakfast', quantity: 2, slug: null }],
      [],
      [],
      [],
      [],
      [{ name: 'Breakfast', slug: 'breakfast' }],
    ]);

    const stored = await store.loadStoredReservation(
      'DEL-123',
      executor as unknown as QueryExecutor,
    );

    assert.deepEqual(stored?.extras, [{ id: 'breakfast', quantity: 2 }]);
  });

  it('updates details, extras and totals, and supersedes the old payment amount', async () => {
    const executor = queuedExecutor([
      [{ id: 'res-1' }],
      [rawReservation()],
      [{ id: 'type-1', slug: 'deluxe-double' }],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
    ]);

    const result = await store.updateReservationHold({
      reference: 'DEL-123',
      guest: {
        fullName: 'New Guest',
        email: 'new@example.com',
        phone: '+2348030000000',
        country: 'NG',
        arrivalTime: '14-16',
        specialRequests: 'High floor',
      },
      extraBed: false,
      quote: quote(),
      executor: executor as unknown as QueryExecutor,
    });

    assert.equal(result.outcome, 'ok');
    assert.equal(result.updated, true);
    assert.equal(result.reservation?.guest.fullName, 'New Guest');
    assert.deepEqual(result.reservation?.extras, [
      { id: 'breakfast', quantity: 2 },
    ]);
    assert.equal(result.reservation?.totals.dueNowMinor, 22_000);
    assert.ok(executor.calls.includes('delete'));
    assert.ok(executor.calls.includes('insert'));
    assert.ok(executor.calls.filter((call) => call === 'update').length >= 2);
  });

  it('does not write when nothing changed', async () => {
    const currentExtras = [
      {
        name: 'Breakfast',
        quantity: 2,
        slug: 'breakfast',
      },
    ];
    const executor = queuedExecutor([
      [{ id: 'res-1' }],
      [rawReservation({ depositRequiredMinor: 22_000, totalMinor: 110_000 })],
      [{ id: 'type-1', slug: 'deluxe-double' }],
      currentExtras,
      [],
      [],
      [],
      [],
    ]);

    const result = await store.updateReservationHold({
      reference: 'DEL-123',
      guest: {
        fullName: 'Ada Example',
        email: 'ada@example.com',
        phone: '+2348000000000',
        country: 'NG',
        arrivalTime: '12-14',
        specialRequests: '',
      },
      extraBed: false,
      quote: quote({ payment: { ...quote().payment, dueNowMinor: 22_000 } }),
      executor: executor as unknown as QueryExecutor,
    });

    assert.equal(result.outcome, 'ok');
    assert.equal(result.updated, false);
    assert.equal(executor.calls.includes('delete'), false);
    assert.equal(executor.calls.includes('insert'), false);
  });
});
