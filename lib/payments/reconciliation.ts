import { ERROR_MESSAGES } from '@/constants/error-messages';
import type {
  PaymentSummaryDelta,
  PaymentSummaryResponse,
} from '@/types/payments.types';

export interface RawPaymentRecord {
  id: string;
  type: 'deposit' | 'balance' | 'full' | 'refund';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  method: 'card' | 'ussd' | 'bank_transfer' | 'cash';
  provider: 'paystack' | 'flutterwave' | 'stripe' | 'bank_transfer' | 'cash';
  amountMinor: number;
  reconciled: boolean;
  reconciledAt?: Date | string | null;
  reconciledBy?: string | null;
  note?: string | null;
  paidAt?: Date | string | null;
  createdAt: Date | string;
}

/**
 * Calculates payment summary metrics and delta against a prior period.
 * Reuse the revenue definitions from the dashboard:
 * Collected = paid payments (deposit, balance, full) minus paid refunds.
 */
export function computePaymentSummary(params: {
  currentPayments: RawPaymentRecord[];
  previousPayments?: RawPaymentRecord[];
  range: { from: string; to: string; label: string };
}): PaymentSummaryResponse {
  const { currentPayments, previousPayments = [], range } = params;

  const calculatePeriodTotals = (list: RawPaymentRecord[]) => {
    let grossCollected = 0;
    let refunds = 0;
    let pendingTransfersCount = 0;
    let pendingTransfersMinor = 0;
    let failedCount = 0;
    let awaitingReconciledCount = 0;
    let awaitingReconciledMinor = 0;

    for (const p of list) {
      if (p.status === 'paid') {
        if (p.type === 'refund') {
          refunds += p.amountMinor;
        } else {
          grossCollected += p.amountMinor;
        }

        // Cash and bank-transfer payments must be reconciled against the hotel's own records
        if (
          !p.reconciled &&
          (p.method === 'cash' || p.method === 'bank_transfer')
        ) {
          awaitingReconciledCount += 1;
          awaitingReconciledMinor += p.amountMinor;
        }
      } else if (p.status === 'pending' && p.method === 'bank_transfer') {
        pendingTransfersCount += 1;
        pendingTransfersMinor += p.amountMinor;
      } else if (p.status === 'failed') {
        failedCount += 1;
      }
    }

    const collectedMinor = Math.max(0, grossCollected - refunds);
    return {
      collectedMinor,
      refundsMinor: refunds,
      pendingTransfersCount,
      pendingTransfersMinor,
      failedCount,
      awaitingReconciledCount,
      awaitingReconciledMinor,
    };
  };

  const curr = calculatePeriodTotals(currentPayments);
  const prev = calculatePeriodTotals(previousPayments);

  const calcPercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const delta: PaymentSummaryDelta = {
    collectedPercent: calcPercent(curr.collectedMinor, prev.collectedMinor),
    refundsPercent: calcPercent(curr.refundsMinor, prev.refundsMinor),
    collectedChangeMinor: curr.collectedMinor - prev.collectedMinor,
    refundsChangeMinor: curr.refundsMinor - prev.refundsMinor,
  };

  return {
    range,
    collectedMinor: curr.collectedMinor,
    refundsMinor: curr.refundsMinor,
    netRevenueMinor: curr.collectedMinor,
    pendingTransfersCount: curr.pendingTransfersCount,
    pendingTransfersMinor: curr.pendingTransfersMinor,
    failedCount: curr.failedCount,
    awaitingReconciledCount: curr.awaitingReconciledCount,
    awaitingReconciledMinor: curr.awaitingReconciledMinor,
    delta,
  };
}

/**
 * Validates a manual refund payout input.
 * It cannot exceed the refund due or the net amount paid on the reservation.
 */
export function validateManualRefundPayout(params: {
  refundDueMinor: number;
  payoutAmountMinor: number;
  reservationTotalPaidMinor: number;
  reservationTotalRefundedMinor: number;
}): { ok: boolean; error?: string } {
  const {
    refundDueMinor,
    payoutAmountMinor,
    reservationTotalPaidMinor,
    reservationTotalRefundedMinor,
  } = params;

  if (payoutAmountMinor <= 0) {
    return { ok: false, error: ERROR_MESSAGES.PAYOUT_AMOUNT_POSITIVE };
  }

  if (payoutAmountMinor > refundDueMinor) {
    return {
      ok: false,
      error: ERROR_MESSAGES.PAYOUT_EXCEEDS_REFUND_DUE(
        (payoutAmountMinor / 100).toLocaleString(),
        (refundDueMinor / 100).toLocaleString(),
      ),
    };
  }

  const remainingPaid =
    reservationTotalPaidMinor - reservationTotalRefundedMinor;
  if (payoutAmountMinor > remainingPaid) {
    return {
      ok: false,
      error: ERROR_MESSAGES.PAYOUT_EXCEEDS_REMAINING(
        (remainingPaid / 100).toLocaleString(),
      ),
    };
  }

  return { ok: true };
}

/**
 * Checks idempotency for manual refund payout execution.
 */
export function checkPayoutIdempotency(params: {
  idempotencyKey: string;
  recordedIdempotencyKeys: Map<
    string,
    { paymentId: string; amountMinor: number }
  >;
  paymentId: string;
}): {
  isDuplicate: boolean;
  previousRecord?: { paymentId: string; amountMinor: number };
} {
  const existing = params.recordedIdempotencyKeys.get(params.idempotencyKey);
  if (existing) {
    return { isDuplicate: true, previousRecord: existing };
  }
  return { isDuplicate: false };
}

/**
 * Reconciles a payment with an optional staff note.
 */
export function reconcilePayment(params: {
  payment: RawPaymentRecord;
  staffUserId: string;
  note?: string;
}): RawPaymentRecord {
  return {
    ...params.payment,
    reconciled: true,
    reconciledAt: new Date(),
    reconciledBy: params.staffUserId,
    note: params.note
      ? params.payment.note
        ? `${params.payment.note}\n${params.note}`
        : params.note
      : params.payment.note,
  };
}

/**
 * Unreconciles a payment. Only allowed for owners and requires a reason.
 */
export function unreconcilePayment(params: {
  payment: RawPaymentRecord;
  actorRole: string;
  reason: string;
}): { ok: boolean; updatedPayment?: RawPaymentRecord; error?: string } {
  if (params.actorRole !== 'owner') {
    return {
      ok: false,
      error: ERROR_MESSAGES.OWNERS_ONLY_UNRECONCILE_BARE,
    };
  }

  const trimmedReason = params.reason?.trim();
  if (!trimmedReason || trimmedReason.length < 5) {
    return {
      ok: false,
      error: ERROR_MESSAGES.UNRECONCILE_REASON_REQUIRED,
    };
  }

  const updatedNote = params.payment.note
    ? `${params.payment.note}\n[Unreconciled]: ${trimmedReason}`
    : `[Unreconciled]: ${trimmedReason}`;

  const updatedPayment: RawPaymentRecord = {
    ...params.payment,
    reconciled: false,
    reconciledAt: null,
    reconciledBy: null,
    note: updatedNote,
  };

  return { ok: true, updatedPayment };
}
