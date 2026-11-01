import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import type { QueryExecutor, StoredReservation } from '../lib/booking/store';

process.env.DATABASE_URL ||=
  'postgresql://postgres:postgres@localhost:5432/checkout_atomicity_test';

type StoreModule = typeof import('../lib/booking/store');
type IdempotencyModule =
  typeof import('../lib/db/repositories/idempotency.repo');

let store!: StoreModule;
let idempotency!: IdempotencyModule;

// Imported here, not at module load: `db` refuses to load without a URL, and this
// harness does not read `.env` the way the app scripts do.
before(async () => {
  store = await import('../lib/booking/store');
  idempotency = await import('../lib/db/repositories/idempotency.repo');
});

/**
 * A stand-in for `db` (or a transaction) that records the statements a helper
 * sends it. Every chain resolves to the configured rows, so a function that still
 * reached for the real `db` would try to open a connection and fail the test.
 */
function fakeExecutor() {
  const calls: string[] = [];
  let rows: unknown[] = [];

  const builder = (name: string) => {
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
    setRows(next: unknown[]) {
      rows = next;
    },
    select: () => {
      calls.push('select');
      return builder('select');
    },
    insert: () => {
      calls.push('insert');
      return builder('insert');
    },
    update: () => {
      calls.push('update');
      return builder('update');
    },
    delete: () => {
      calls.push('delete');
      return builder('delete');
    },
    execute: async () => {
      calls.push('execute');
      return rows;
    },
  };
}

function reservation(
  overrides: Partial<StoredReservation> = {},
): StoredReservation {
  return {
    id: 'res-1',
    roomId: 'room-1',
    roomTypeId: 'type-1',
    reference: 'DEL-123',
    roomSlug: 'deluxe-double',
    stay: {
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      adults: 2,
      children: 0,
      extraBed: false,
    },
    extras: [],
    totals: {
      totalMinor: 100_000,
      dueNowMinor: 20_000,
      balanceAtHotelMinor: 80_000,
    },
    mode: 'deposit',
    confirmationMode: 'instant',
    method: null,
    status: 'pending_payment',
    holdExpiresAt: Date.UTC(2026, 10, 1, 12, 15, 0),
    termsAcceptedAt: new Date(Date.UTC(2026, 10, 1, 12, 0, 0)).toISOString(),
    createdAt: Date.UTC(2026, 10, 1, 12, 0, 0),
    proof: null,
    guest: {
      fullName: 'Ada Example',
      email: 'ada@example.com',
      phone: '08000000000',
      country: 'NG',
      arrivalTime: '',
      specialRequests: '',
    },
    snapshot: {
      breakdown: {
        roomSubtotalMinor: 100_000,
        extras: [],
        taxMinor: 0,
        serviceChargeMinor: 0,
      },
    },
    paidMinor: 20_000,
    refundedMinor: 0,
    paymentReference: null,
    paymentProvider: null,
    paidAt: null,
    history: [],
    changeCount: 0,
    cancellation: null,
    refunds: [],
    pendingChange: null,
    ...overrides,
  } as unknown as StoredReservation;
}

describe('checkout atomicity', () => {
  it('serialises a freshly created hold to the same replay body', () => {
    const holdExpiresAt = Date.UTC(2026, 10, 1, 12, 15, 0);
    const response = store.toReservationResponse(
      reservation({ holdExpiresAt }),
    );

    assert.equal(response.status, 'pending_payment');
    assert.equal(response.holdExpiresAt, new Date(holdExpiresAt).toISOString());
    assert.deepEqual(response.amounts, {
      totalMinor: 100_000,
      dueNowMinor: 20_000,
      balanceAtHotelMinor: 80_000,
    });
  });

  it('claims through the executor it is given', async () => {
    const executor = fakeExecutor();
    executor.setRows([
      {
        key: 'res:test',
        response: null,
        statusCode: 0,
        expiresAt: new Date(Date.now() + 120_000),
        reservationId: null,
        method: 'POST',
        path: '/api/reservations',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await idempotency.claimIdempotency(
      'res:test',
      120,
      {},
      executor as never,
    );

    assert.equal(result.claimed, true);
    assert.ok(executor.calls.includes('insert'));
    assert.equal(executor.calls.includes('select'), false);
  });

  it('finishes through the executor it is given', async () => {
    const executor = fakeExecutor();

    await idempotency.finishIdempotency(
      'res:test',
      { reference: 'DEL-123' },
      201,
      60,
      {},
      executor as never,
    );

    assert.ok(executor.calls.includes('update'));
  });

  it('joins the caller transaction in saveStoredReservation instead of nesting', async () => {
    const executor = fakeExecutor();

    await store.saveStoredReservation(
      reservation(),
      executor as unknown as QueryExecutor,
    );

    assert.ok(executor.calls.includes('update'));
    assert.ok(executor.calls.some((call) => call.startsWith('select')));
  });

  it('joins the caller transaction in ensureBankTransferPayment instead of nesting', async () => {
    const executor = fakeExecutor();

    const result = await store.ensureBankTransferPayment(
      { reservationId: 'res-1', amountMinor: 20_000 },
      executor as unknown as QueryExecutor,
    );

    assert.equal(result.reused, false);
    assert.ok(executor.calls.includes('select'));
    assert.ok(executor.calls.includes('insert'));
  });
});
