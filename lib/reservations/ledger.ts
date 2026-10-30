export interface LedgerEntry {
  type: 'deposit' | 'balance' | 'full' | 'refund';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amountMinor: number;
}

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

export function balanceFromLedger(
  totalMinor: number,
  paidMinor: number,
  refundedMinor: number,
): number {
  return Math.max(0, totalMinor - paidMinor + refundedMinor);
}
