import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkPayoutIdempotency,
  reconcilePayment,
  unreconcilePayment,
  validateManualRefundPayout,
  type RawPaymentRecord,
} from '../lib/payments/reconciliation';

describe('Payments & Reconciliation Helpers', () => {
  it('1. Rejects a refund payout larger than what was paid or due', () => {
    const invalidExceedDue = validateManualRefundPayout({
      refundDueMinor: 50_000_00,
      payoutAmountMinor: 60_000_00, // exceeds 50,000
      reservationTotalPaidMinor: 100_000_00,
      reservationTotalRefundedMinor: 0,
    });
    assert.strictEqual(invalidExceedDue.ok, false);
    assert.match(
      invalidExceedDue.error!,
      /cannot exceed the refund amount due/,
    );

    const invalidExceedPaid = validateManualRefundPayout({
      refundDueMinor: 50_000_00,
      payoutAmountMinor: 40_000_00,
      reservationTotalPaidMinor: 50_000_00,
      reservationTotalRefundedMinor: 30_000_00, // only 20,000 unrefunded remaining!
    });
    assert.strictEqual(invalidExceedPaid.ok, false);
    assert.match(
      invalidExceedPaid.error!,
      /exceeds remaining un-refunded payments/,
    );

    const valid = validateManualRefundPayout({
      refundDueMinor: 50_000_00,
      payoutAmountMinor: 20_000_00,
      reservationTotalPaidMinor: 50_000_00,
      reservationTotalRefundedMinor: 30_000_00,
    });
    assert.strictEqual(valid.ok, true);
  });

  it('2. Enforces idempotency when webhook or payout processed twice with same idempotency key', () => {
    const recordedKeys = new Map<
      string,
      { paymentId: string; amountMinor: number }
    >();
    const idempotencyKey = 'idem-key-unique-12345';

    // First attempt
    const firstCheck = checkPayoutIdempotency({
      idempotencyKey,
      recordedIdempotencyKeys: recordedKeys,
      paymentId: 'pay-001',
    });
    assert.strictEqual(firstCheck.isDuplicate, false);

    // Save record
    recordedKeys.set(idempotencyKey, {
      paymentId: 'pay-001',
      amountMinor: 25_000_00,
    });

    // Second duplicate attempt
    const secondCheck = checkPayoutIdempotency({
      idempotencyKey,
      recordedIdempotencyKeys: recordedKeys,
      paymentId: 'pay-001',
    });
    assert.strictEqual(secondCheck.isDuplicate, true);
    assert.strictEqual(secondCheck.previousRecord?.paymentId, 'pay-001');
    assert.strictEqual(secondCheck.previousRecord?.amountMinor, 25_000_00);
  });

  it('3. Reconciles payment and then allows owner to unreconcile with reason', () => {
    const originalPayment: RawPaymentRecord = {
      id: 'pay-cash-1',
      type: 'full',
      status: 'paid',
      method: 'cash',
      provider: 'cash',
      amountMinor: 80_000_00,
      reconciled: false,
      reconciledAt: null,
      reconciledBy: null,
      note: 'Verified in cash register',
      createdAt: new Date().toISOString(),
    };

    // Reconcile
    const reconciled = reconcilePayment({
      payment: originalPayment,
      staffUserId: 'staff-manager-1',
      note: 'Matched cash ledger #44',
    });
    assert.strictEqual(reconciled.reconciled, true);
    assert.strictEqual(reconciled.reconciledBy, 'staff-manager-1');
    assert.ok(reconciled.reconciledAt);
    assert.match(reconciled.note!, /Matched cash ledger #44/);

    // Manager attempts to unreconcile -> forbidden
    const managerUnreconcile = unreconcilePayment({
      payment: reconciled,
      actorRole: 'manager',
      reason: 'Discrepancy found',
    });
    assert.strictEqual(managerUnreconcile.ok, false);
    assert.match(managerUnreconcile.error!, /Only owners/);

    // Owner unreconciles without sufficient reason -> rejected
    const ownerNoReason = unreconcilePayment({
      payment: reconciled,
      actorRole: 'owner',
      reason: 'bad',
    });
    assert.strictEqual(ownerNoReason.ok, false);

    // Owner unreconciles with reason -> succeeded
    const ownerSuccess = unreconcilePayment({
      payment: reconciled,
      actorRole: 'owner',
      reason: 'Physical receipt does not match register amount',
    });
    assert.strictEqual(ownerSuccess.ok, true);
    assert.strictEqual(ownerSuccess.updatedPayment?.reconciled, false);
    assert.strictEqual(ownerSuccess.updatedPayment?.reconciledAt, null);
    assert.strictEqual(ownerSuccess.updatedPayment?.reconciledBy, null);
    assert.match(
      ownerSuccess.updatedPayment?.note ?? '',
      /\[Unreconciled\]: Physical receipt does not match/,
    );
  });
});
