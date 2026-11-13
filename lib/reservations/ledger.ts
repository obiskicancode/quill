/**
 * Pure reservation ledger helpers. Paid refunds reduce net collected revenue;
 * pending refunds are tracked separately until the provider confirms them.
 *
 * The payment fields needed to derive ledger totals.
 */
export interface LedgerEntry {
  type: 'deposit' | 'balance' | 'full' | 'refund';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amountMinor: number;
}

/** Sums paid charges, paid refunds and pending refunds from payment rows. */
export function ledgerFromPayments(rows: LedgerEntry[]): {
  paidMinor: number;
  refundedMinor: number;
  pendingRefundMinor: number;
} {
  let paidMinor = 0;
  let refundedMinor = 0;
  let pendingRefundMinor = 0;

  for (const row of rows) {
    if (row.type === 'refund') {
      if (row.status === 'paid') refundedMinor += row.amountMinor;
      if (row.status === 'pending') pendingRefundMinor += row.amountMinor;
      continue;
    }
    if (row.status === 'paid') paidMinor += row.amountMinor;
  }

  return { paidMinor, refundedMinor, pendingRefundMinor };
}

/** Remaining amount due, never below zero. */
export function balanceFromLedger(
  totalMinor: number,
  paidMinor: number,
  refundedMinor: number,
): number {
  return Math.max(0, totalMinor - paidMinor + refundedMinor);
}
