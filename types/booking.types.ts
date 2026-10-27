import type {
  BankDetails,
  CheckoutBreakdown,
  ConfirmationMode,
  ExtraItem,
  GuestReservationStatus,
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
  PolicySummary,
} from '@/types/checkout.types';
import type { ISODate } from '@/types/dates.types';
import type {
  ManageData,
  RefundMethod,
  RefundStatus,
} from '@/types/manage.types';

/** Confirmation-page contract. Money is integer minor units (kobo); the UI divides by 100. */

export interface HotelInfo {
  name: string;
  addressLines: string[];
  mapQuery: string | null;
  phoneDisplay: string;
  phoneTel: string;
  whatsappNumber: string;
  reception: string;
  landmarks: { name: string; distance: string }[];
  howToFindUs: string;
}

export type AfterDeadlineRule =
  | { kind: 'first_night' }
  | { kind: 'percent'; percent: number }
  | { kind: 'full' };

/** Copied onto the reservation when it is created. The page always shows this, never the current hotel settings. */
export interface PolicySnapshot {
  cancellation: PolicySummary;
  checkInRules: string;
  checkOutRules: string;
  houseRules: string[];
  idRequired: boolean;
  idText: string;
  /** What the hotel keeps once the free window has ended. */
  afterDeadline: AfterDeadlineRule;
  /** Hours before check-in that free cancellation ends. Null when there is none. */
  freeCancellationHours: number | null;
}

export interface ReservationSnapshot {
  room: {
    slug: string;
    name: string;
    bedConfig: string;
    image: { src: string; alt: string } | null;
  };
  breakdown: CheckoutBreakdown;
  policy: PolicySnapshot;
  hotel: HotelInfo;
  times: {
    checkIn: string;
    checkOut: string;
    checkIn24: string;
    checkOut24: string;
    timeZone: string;
  };
  providerName: string;
  approvalResponse: string;
  addExtras: { supported: boolean; catalog: ExtraItem[] };
}

export interface GuestInfo {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  arrivalTime: string;
  specialRequests: string;
}

export type PaymentLabel =
  | 'Paid'
  | 'Deposit paid'
  | 'Awaiting verification'
  | 'Awaiting confirmation'
  | 'Awaiting hotel approval'
  | 'Pay at hotel'
  | 'Not paid'
  | 'Refund started'
  | 'Refund pending'
  | 'Cancelled';

/** Set once a guest has cancelled. */
export interface GuestCancellation {
  at: string;
  refundMinor: number;
  retainedMinor: number;
  refundStatus: RefundStatus;
  refundMethod: RefundMethod;
  timeline: string | null;
}

export interface CalendarEvent {
  reference: string;
  hotelName: string;
  address: string;
  checkIn: ISODate;
  checkOut: ISODate;
  /** "HH:MM", 24-hour, in the hotel's time zone. */
  checkInTime: string;
  checkOutTime: string;
  timeZone: string;
  guestsLabel?: string;
}

export interface GuestReservation {
  reference: string;
  status: GuestReservationStatus;
  paymentStatus: PaymentStatus;
  confirmationMode: ConfirmationMode;
  mode: PaymentMode;
  method: PaymentMethod | null;
  /** true after the guest proved their email: only then are email and phone shown in full. */
  verified: boolean;
  stay: {
    checkIn: ISODate | null;
    checkOut: ISODate | null;
    nights: number;
    adults: number;
    children: number;
  };
  room: ReservationSnapshot['room'];
  times: ReservationSnapshot['times'];
  breakdown: CheckoutBreakdown;
  policy: PolicySnapshot;
  hotel: HotelInfo;
  approvalResponse: string;
  addExtras: ReservationSnapshot['addExtras'];
  guest: {
    fullName: string;
    email: string;
    phone: string;
    arrival: string;
    specialRequests: string;
  };
  amounts: {
    totalMinor: number;
    paidMinor: number;
    dueNowMinor: number;
    balanceMinor: number;
  };
  payment: {
    label: PaymentLabel;
    methodLabel: string;
    reference: string | null;
    paidAt: string | null;
  };
  bank: { details: BankDetails; amountMinor: number } | null;
  proofUploaded: boolean;
  holdExpiresAt: string | null;
  serverTime: string;
  cancellation: GuestCancellation | null;
  /** Present only for a manage-booking session: allowed actions, timeline, CSRF token and more. */
  manage?: ManageData;
}

export type HeaderKind =
  | 'confirmed'
  | 'confirmed-deposit'
  | 'confirming'
  | 'transfer'
  | 'approval'
  | 'pay-at-hotel'
  | 'ended';

export interface BookingApiError {
  code:
    'unauthorised' | 'not_verified' | 'rate_limited' | 'validation' | 'server';
  message: string;
  retryAfterSeconds?: number;
}

export interface ResendResponse {
  sent: true;
  cooldownSeconds: number;
}
