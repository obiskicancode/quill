import type { ISODate } from '@/types/dates.types';
import type { ExtraPricingUnit } from '@/types/inventory.types';
import type { StayQuote } from '@/types/stay.types';

/**
 * API contract for checkout. Money is always integer minor units (kobo); the UI divides by 100.
 * The server is the only authority on prices, taxes, deposit amount and availability.
 */

export type PaymentMode = 'full' | 'deposit' | 'pay_at_hotel';
export type PaymentMethod = 'online' | 'bank_transfer';
export type PaymentProvider = 'paystack' | 'flutterwave' | 'stripe';
export type ConfirmationMode = 'instant' | 'manual';
export interface Country {
  code: string;
  name: string;
  dial: string;
}

export interface ExtraItem {
  id: string;
  name: string;
  description: string;
  unit: ExtraPricingUnit;
  priceMinor: number;
  maxQuantity: number;
}

export interface ExtraSelection {
  id: string;
  quantity: number;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface CheckoutOverrides {
  paymentMode?: PaymentMode;
  discountPercent?: number;
  discountLabel?: string;
  levyPercent?: number;
  levyLabel?: string;
}

export interface CheckoutSettings {
  paymentMode: PaymentMode;
  depositPercent: number;
  acceptedMethods: PaymentMethod[];
  provider: PaymentProvider;
  confirmationMode: ConfirmationMode;
  holdSeconds: number;
  bank: BankDetails;
  extras: ExtraItem[];
  discount: { label: string; percent: number } | null;
  otherLevy: { label: string; percent: number } | null;
  /** 24-hour check-in time used to work out the cancellation deadline. */
  checkInTime24: string;
  nonRefundable: boolean;
  freeCancellationHours: number | null;
}

export interface BreakdownExtraLine {
  id: string;
  name: string;
  quantity: number;
  unitLabel: string;
  totalMinor: number;
}

export interface CheckoutBreakdown extends Omit<
  StayQuote,
  'freeCancellationUntil'
> {
  extras: BreakdownExtraLine[];
  discount: { label: string; amountMinor: number } | null;
  otherLevy: { label: string; percent: number; amountMinor: number } | null;
}

export interface PolicySummary {
  nonRefundable: boolean;
  freeCancellationUntil: { date: ISODate; time: string } | null;
  note: string;
}

export interface PaymentPlan {
  mode: PaymentMode;
  totalMinor: number;
  dueNowMinor: number;
  balanceAtHotelMinor: number;
  acceptedMethods: PaymentMethod[];
  provider: PaymentProvider;
}

export interface QuoteRequest {
  room: string;
  checkIn: ISODate;
  checkOut: ISODate;
  adults: number;
  children: number;
  extraBed: boolean;
  extras: ExtraSelection[];
  /** What the guest last saw on the room page. Only used to show "Price updated". */
  seenTotalMinor?: number | null;
}

export type CheckoutQuoteResponse =
  | {
      status: 'ok';
      breakdown: CheckoutBreakdown;
      policy: PolicySummary;
      payment: PaymentPlan;
      confirmationMode: ConfirmationMode;
      holdSeconds: number;
      extrasCatalog: ExtraItem[];
      extraBed: {
        needed: boolean;
        available: boolean;
        priceMinor: number | null;
        selected: boolean;
      };
      priceChange: {
        previousTotalMinor: number;
        currentTotalMinor: number;
      } | null;
      serverTime: string;
    }
  | {
      status: 'unavailable';
      suggestions: {
        checkIn: ISODate;
        checkOut: ISODate;
        totalMinor: number;
      }[];
      serverTime: string;
    }
  | { status: 'invalid'; reason: 'params' | 'rules'; message: string };

export type GuestReservationStatus =
  | 'pending_payment'
  | 'awaiting_transfer'
  | 'awaiting_verification'
  | 'pending_approval'
  | 'reserved_pay_at_hotel'
  | 'confirmed'
  | 'payment_failed'
  | 'cancelled'
  | 'expired'
  | 'checked_in'
  | 'checked_out'
  | 'no_show';

export type PaymentStatus =
  'none' | 'pending' | 'paid' | 'failed' | 'cancelled';

export interface ReservationResponse {
  reference: string;
  status: GuestReservationStatus;
  holdExpiresAt: string;
  serverTime: string;
  confirmationMode: ConfirmationMode;
  amounts: {
    totalMinor: number;
    dueNowMinor: number;
    balanceAtHotelMinor: number;
  };
}

export interface PaymentInitRequest {
  reference: string;
  method: PaymentMethod;
  idempotencyKey: string;
  /** 'change' pays the difference for a date change on the manage page. */
  purpose?: 'booking' | 'change';
  changeId?: string;
}

export type PaymentInitResponse =
  | { kind: 'redirect'; url: string }
  | {
      kind: 'bank_transfer';
      bank: BankDetails;
      amountMinor: number;
      reference: string;
    };

export interface StatusResponse {
  reference: string;
  status: GuestReservationStatus;
  paymentStatus: PaymentStatus;
  holdExpiresAt: string;
  serverTime: string;
  confirmationMode: ConfirmationMode;
}

export type ApiErrorCode =
  | 'validation'
  | 'unavailable'
  | 'price_changed'
  | 'rate_limited'
  | 'rejected'
  | 'hold_expired'
  | 'not_found'
  | 'bad_file'
  | 'server';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  quote?: CheckoutQuoteResponse;
}

export type CheckoutQuoteOk = Extract<CheckoutQuoteResponse, { status: 'ok' }>;

export interface ReservationRoomSummary {
  name: string;
  bedConfig: string;
  image: { src: string; alt: string } | null;
}

export interface RoomBookingSummary {
  slug: string;
  name: string;
  maxAdults: number;
  maxChildren: number;
  /** Guests above this need the extra bed. */
  baseGuests: number;
  showPrice: boolean;
  basePriceNgn: number;
  taxesIncluded: boolean;
  extraBed: { available: boolean; priceMinor: number | null };
}

/** The room page passes a plain StayQuote. Checkout adds extras, a discount and another levy. */
export type PriceBreakdownQuote = Omit<StayQuote, 'freeCancellationUntil'> & {
  extras?: {
    id: string;
    name: string;
    quantity: number;
    unitLabel: string;
    totalMinor: number;
  }[];
  discount?: { label: string; amountMinor: number } | null;
  otherLevy?: { label: string; percent: number; amountMinor: number } | null;
};
