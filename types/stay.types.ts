import type { ISODate } from '@/types/dates.types';

/** Shared by the server (pricing, API route) and the booking card. Money is integer minor units (kobo). */

export interface StayInput {
  checkIn: ISODate | null;
  checkOut: ISODate | null;
  adults: number;
  children: number;
  extraBed: boolean;
}

export type StayPatch = Partial<StayInput>;

export type ViolationCode =
  | 'checkout-before-checkin'
  | 'checkin-past'
  | 'same-day-cutoff'
  | 'min-nights'
  | 'max-nights'
  | 'booking-window'
  | 'over-capacity'
  | 'extra-bed-required';

export interface Violation {
  code: ViolationCode;
  message: string;
  /** One tap that fixes the problem. */
  fix?: { label: string; patch: StayPatch };
}

export interface QuoteLine {
  date: ISODate;
  rateMinor: number;
  note: string | null;
}

export interface StayQuote {
  nights: number;
  lines: QuoteLine[];
  roomSubtotalMinor: number;
  averageNightlyMinor: number;
  extraBed: { perNightMinor: number; totalMinor: number } | null;
  serviceChargePercent: number;
  serviceChargeMinor: number;
  taxPercent: number;
  taxMinor: number;
  taxIncluded: boolean;
  totalMinor: number;
  /** Last day to cancel free of charge, or null when it does not apply. */
  freeCancellationUntil: ISODate | null;
}

export type QuoteResponse =
  | { status: 'available'; remaining: number; quote: StayQuote }
  | {
      status: 'sold-out';
      suggestions: {
        checkIn: ISODate;
        checkOut: ISODate;
        totalMinor: number;
      }[];
    }
  | { status: 'on-request' }
  | { status: 'invalid'; violations: Violation[] };
