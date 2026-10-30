import assert from 'node:assert';

import {
  balanceFromLedger,
  ledgerFromPayments,
} from '../lib/reservations/ledger';

console.log('=== RUNNING PAYMENT LEDGER TESTS ===\n');

console.log('Test L.1: paid non-refund rows count, failed/pending do not');
assert.deepStrictEqual(
  ledgerFromPayments([
    { type: 'deposit', status: 'paid', amountMinor: 20_000 },
    { type: 'balance', status: 'pending', amountMinor: 80_000 },
    { type: 'full', status: 'failed', amountMinor: 100_000 },
  ]),
  { paidMinor: 20_000, refundedMinor: 0, pendingRefundMinor: 0 },
);

console.log('Test L.2: paid and pending refunds are separated');
assert.deepStrictEqual(
  ledgerFromPayments([
    { type: 'full', status: 'paid', amountMinor: 100_000 },
    { type: 'refund', status: 'paid', amountMinor: 25_000 },
    { type: 'refund', status: 'pending', amountMinor: 15_000 },
  ]),
  { paidMinor: 100_000, refundedMinor: 25_000, pendingRefundMinor: 15_000 },
);

console.log('Test L.3: balance never goes below zero');
assert.strictEqual(balanceFromLedger(100_000, 100_000, 0), 0);
assert.strictEqual(balanceFromLedger(100_000, 60_000, 10_000), 50_000);
assert.strictEqual(balanceFromLedger(100_000, 100_000, 30_000), 30_000);
assert.strictEqual(balanceFromLedger(100_000, 120_000, 0), 0);

console.log('\nAll payment ledger tests passed.');
