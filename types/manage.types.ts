import type { ISODate } from '@/lib/dates';
import type {
  BankDetails,
  CheckoutBreakdown,
  PaymentMethod,
  PolicySummary,
} from '@/types/checkout.types';
import type { Violation } from '@/types/stay.types';

/** Manage-booking contract. Money is integer minor units (kobo). The server decides every policy, refund, price and availability. */

// ---------- refunds ----------
export type RefundKind =
  | 'free'
  | 'partial'
  | 'non_refundable'
  | 'deposit_only'
  | 'pay_at_hotel'
  | 'bank_transfer'
  | 'unpaid';
export type RefundMethod = 'original_payment' | 'manual_bank' | 'none';

export interface RefundResult {
  kind: RefundKind;
  refundMinor: number;
  retainedMinor: number;
  /** The policy reason, in plain language. */
  rule: string;
  refundMethod: RefundMethod;
  /** Expected wait, from hotel settings. Null when nothing is refunded. */
  timeline: string | null;
}

export interface CancellationPreview extends RefundResult {
  paidMinor: number;
  totalMinor: number;
  evaluatedAt: string;
}

// ---------- allowed actions ----------
export interface ActionAllowance {
  allowed: boolean;
  /** Plain-language reason when not allowed. */
  reason?: string;
}

export interface AllowedActions {
  canCancel: ActionAllowance;
  canChangeDates: ActionAllowance;
  canEditDetails: ActionAllowance;
  canAddExtras: ActionAllowance;
  changesRemaining: number;
}

// ---------- activity ----------
export type HistoryType =
  | 'created'
  | 'payment_received'
  | 'payment_verified'
  | 'transfer_proof_received'
  | 'approved'
  | 'details_changed'
  | 'dates_changed'
  | 'change_requested'
  | 'change_expired'
  | 'email_sent'
  | 'cancelled'
  | 'refund_initiated'
  | 'refund_pending_manual'
  | 'expired'
  | 'checked_in'
  | 'checked_out'
  | 'no_show';

export interface HistoryEntry {
  id: string;
  at: number;
  type: HistoryType;
  detail?: string;
}

export interface TimelineEntry {
  id: string;
  at: string;
  label: string;
  detail?: string;
}

// ---------- stored on the reservation ----------
export type RefundStatus = 'initiated' | 'pending_manual' | 'none';

export interface StoredCancellation {
  at: number;
  reason: string | null;
  note: string | null;
  refund: RefundResult;
  refundStatus: RefundStatus;
}

export interface RefundRecord {
  id: string;
  at: number;
  amountMinor: number;
  method: RefundMethod;
  status: RefundStatus;
}

export type PendingChangeStatus =
  | 'awaiting_payment'
  | 'awaiting_transfer'
  | 'awaiting_verification'
  | 'payment_failed';

export interface PendingChange {
  changeId: string;
  checkIn: ISODate;
  checkOut: ISODate;
  breakdown: CheckoutBreakdown;
  totalMinor: number;
  amountDueMinor: number;
  holdExpiresAt: number;
  method: PaymentMethod | null;
  status: PendingChangeStatus;
  payment: {
    webhookAt: number;
    outcome: 'paid' | 'failed' | 'cancelled';
  } | null;
  roomReassigned: boolean;
  /** The cancellation deadline that will apply once the new dates take effect. */
  policy: PolicySummary;
}

export interface PendingChangeView {
  changeId: string;
  checkIn: ISODate;
  checkOut: ISODate;
  amountDueMinor: number;
  holdExpiresAt: string;
  status: PendingChangeStatus;
  method: PaymentMethod | null;
  bank: { details: BankDetails; amountMinor: number } | null;
  acceptedMethods: PaymentMethod[];
  providerName: string;
}

// ---------- what the manage page receives ----------
export interface ManageData {
  /** Send back as the X-CSRF-Token header on every change. */
  csrfToken: string;
  sessionExpiresAt: string;
  allowed: AllowedActions;
  timeline: TimelineEntry[];
  /** What would happen if the guest cancelled right now. Null when the booking cannot be cancelled. */
  cancellation: CancellationPreview | null;
  pendingChange: PendingChangeView | null;
  /** Full contact details, revealed on request (the guest is already verified). */
  contact: { email: string; phone: string };
  editable: {
    fullName: string;
    phone: string;
    country: string;
    arrivalTime: string;
    specialRequests: string;
  };
}

// ---------- requests and responses ----------
export type ManageErrorCode =
  | 'session_expired'
  | 'csrf'
  | 'not_allowed'
  | 'preview_changed'
  | 'quote_stale'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'not_found';

export interface ManageApiError {
  code: ManageErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  preview?: CancellationPreview;
  retryAfterSeconds?: number;
}

export const CANCEL_REASONS = [
  'Change of plans',
  'Found another place',
  'Travel disrupted',
  'Booked by mistake',
  'Prefer not to say',
] as const;

export interface ChangeQuoteRequest {
  checkIn: ISODate;
  checkOut: ISODate;
}

export type PriceDifference =
  | { kind: 'pay'; amountMinor: number; settle: 'now' | 'at_hotel' }
  | {
      kind: 'refund';
      amountMinor: number;
      settle: 'now' | 'at_hotel';
      refundMethod: RefundMethod;
      timeline: string | null;
    }
  | { kind: 'none'; amountMinor: 0; settle: 'now' | 'at_hotel' };

export type ChangeQuoteResponse =
  | {
      status: 'ok';
      quoteId: string;
      expiresAt: string;
      checkIn: ISODate;
      checkOut: ISODate;
      nights: number;
      breakdown: CheckoutBreakdown;
      oldTotalMinor: number;
      newTotalMinor: number;
      difference: PriceDifference;
      roomReassigned: boolean;
      newPolicy: {
        nonRefundable: boolean;
        freeCancellationUntil: { date: ISODate; time: string } | null;
      };
      holdSeconds: number;
    }
  | {
      status: 'unavailable';
      suggestions: {
        checkIn: ISODate;
        checkOut: ISODate;
        totalMinor: number;
      }[];
    }
  | { status: 'rule'; violations: Violation[] }
  | { status: 'not_allowed'; reason: string };
