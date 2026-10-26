import { z } from 'zod';

import type { ReservationStatus } from './dashboard.types';

export type PaymentState =
  'unpaid' | 'deposit_paid' | 'fully_paid' | 'refunded';

export type BookingSource = 'website' | 'admin' | 'phone' | 'walk_in';

export type DateFilterField = 'check_in' | 'check_out' | 'created_at';

export type QuickFilter =
  'arriving_today' | 'departing_today' | 'in_house' | 'needs_attention';

export type ReservationSortField =
  'check_in' | 'created_at' | 'total_minor' | 'guest_name';

export type SortOrder = 'asc' | 'desc';

export function computePaymentState(
  totalMinor: number,
  amountPaidMinor: number,
  amountRefundedMinor: number,
): PaymentState {
  if (amountRefundedMinor > 0) return 'refunded';
  if (amountPaidMinor >= totalMinor && totalMinor > 0) return 'fully_paid';
  if (amountPaidMinor > 0) return 'deposit_paid';
  return 'unpaid';
}

export function computeBalanceDue(
  totalMinor: number,
  amountPaidMinor: number,
  amountRefundedMinor: number,
  status: ReservationStatus,
): number {
  if (status === 'cancelled') return 0;
  return Math.max(0, totalMinor - amountPaidMinor + amountRefundedMinor);
}

export const reservationsListQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return Array.isArray(val) ? val : [val];
    }),
  dateField: z.enum(['check_in', 'check_out', 'created_at']).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  roomTypeId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  source: z.enum(['website', 'admin', 'phone', 'walk_in']).optional(),
  paymentState: z
    .enum(['unpaid', 'deposit_paid', 'fully_paid', 'refunded'])
    .optional(),
  filter: z
    .enum(['arriving_today', 'departing_today', 'in_house', 'needs_attention'])
    .optional(),
  sort: z
    .enum(['check_in', 'created_at', 'total_minor', 'guest_name'])
    .default('check_in'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type ReservationsListQueryParams = z.infer<
  typeof reservationsListQuerySchema
>;

export interface ReservationListItem {
  id: string;
  reference: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  roomTypeId: string;
  roomTypeName: string;
  roomId: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  paymentState: PaymentState;
  totalMinor: number;
  amountPaidMinor: number;
  amountRefundedMinor: number;
  balanceMinor: number;
  bookingSource: BookingSource;
  createdAt: string;
  arrivalTime: string | null;
}

export interface ReservationsListResponse {
  rows: ReservationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  appliedFilters: {
    q?: string;
    status?: string[];
    dateField?: string;
    from?: string;
    to?: string;
    roomTypeId?: string;
    roomId?: string;
    source?: string;
    paymentState?: string;
    filter?: string;
    sort: string;
    order: string;
  };
  options: {
    roomTypes: { id: string; name: string }[];
    rooms: { id: string; roomNumber: string; roomTypeId: string }[];
  };
}

// Detail View Entities
export interface ReservationNightItem {
  id: string;
  date: string;
  rateMinor: number;
  ruleName?: string | null;
}

export interface ReservationExtraItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  pricingUnit: string;
}

export interface ReservationStatusHistoryItem {
  id: string;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  reason: string | null;
  changedBy: string | null;
  actorName: string;
  actorRole: string | null;
  createdAt: string;
}

export interface ReservationPaymentItem {
  id: string;
  reference: string;
  provider: string;
  type: string;
  status: string;
  amountMinor: number;
  providerRef: string | null;
  paidAt: string | null;
  createdAt: string;
  proofThumbnailUrl: string | null;
  proofKey: string | null;
  proofMimeType: string | null;
}

export interface ReservationNotificationLogItem {
  id: string;
  templateKey: string | null;
  channel: string;
  recipient: string;
  subject: string | null;
  status: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface ReservationAuditEntry {
  id: string;
  action: string;
  reason: string | null;
  actorName: string;
  actorRole: string | null;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

export interface ReservationPolicySnapshot {
  cancellationPolicyType: string;
  freeCancellationHours: number | null;
  freeCancellationUntil: string | null;
  checkInTime: string;
  checkOutTime: string;
  houseRules: string[];
}

export interface ReservationAlertFlags {
  bankTransferPendingVerification: boolean;
  awaitingHotelApproval: boolean;
  holdExpiringSoon: boolean;
  holdExpired: boolean;
  balanceDueArrivingSoon: boolean;
  roomBlockedOrMaintenance: boolean;
  roomBlockedReason?: string;
  failedNotification: boolean;
}

export interface ReservationDetail {
  id: string;
  reference: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  guestCountry: string | null;
  specialRequests: string | null;
  notes: string | null;
  roomTypeId: string;
  roomTypeName: string;
  roomId: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  extraBedAvailable: boolean;
  arrivalTime: string | null;
  status: ReservationStatus;
  bookingSource: BookingSource;
  channel: string | null;
  paymentMode: string;
  confirmationMode: string;
  // Financials
  subtotalMinor: number;
  extrasMinor: number;
  discountMinor: number;
  taxMinor: number;
  serviceChargeMinor: number;
  totalMinor: number;
  depositRequiredMinor: number;
  amountPaidMinor: number;
  amountRefundedMinor: number;
  balanceMinor: number;
  currency: string;
  paymentState: PaymentState;
  // Timestamps
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  nightsList: ReservationNightItem[];
  extrasList: ReservationExtraItem[];
  statusHistory: ReservationStatusHistoryItem[];
  payments: ReservationPaymentItem[] | null; // null if not authorized
  notifications: ReservationNotificationLogItem[];
  auditLogs: ReservationAuditEntry[] | null; // null if not authorized
  policySnapshot: ReservationPolicySnapshot;
  alerts: ReservationAlertFlags;
  allowedActions: AllowedActions;
}

export interface ActionPermission {
  allowed: boolean;
  reason?: string;
}

export interface AllowedActions {
  edit_details: ActionPermission;
  reassign_room: ActionPermission;
  change_dates: ActionPermission;
  cancel: ActionPermission;
  record_payment: ActionPermission;
  refund: ActionPermission;
  verify_bank_transfer: ActionPermission;
  approve: ActionPermission;
  decline: ActionPermission;
  no_show: ActionPermission;
  resend_confirmation: ActionPermission;
  check_in: ActionPermission;
  check_out: ActionPermission;
}

export interface ReservationNeighbors {
  prevId: string | null;
  nextId: string | null;
}

// -------------------------------------------------------------
// Action Request Schemas
// -------------------------------------------------------------

export const adminCreateReservationSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid check-in date'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid check-out date'),
  adults: z.number().int().min(1, 'At least 1 adult is required'),
  children: z.number().int().min(0).default(0),
  roomTypeId: z.string().uuid('Invalid room type ID'),
  roomId: z.string().uuid().optional(),
  extraBed: z.boolean().default(false),
  extras: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().int().min(1),
      }),
    )
    .default([]),
  guest: z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z
      .string()
      .email('Invalid email address')
      .optional()
      .or(z.literal('')),
    phone: z.string().min(6, 'Valid phone number is required'),
    country: z.string().default('NG'),
    arrivalTime: z.string().optional(),
    specialRequests: z.string().optional(),
  }),
  noEmail: z.boolean().default(false),
  internalNotes: z.string().optional(),
  source: z.enum(['phone', 'walk_in', 'admin']).default('phone'),
  discount: z
    .object({
      type: z.enum(['fixed', 'percentage']),
      value: z.number().positive(),
      reason: z.string().min(3, 'Discount reason is required'),
    })
    .optional(),
  paymentChoice: z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('hold'),
      holdHours: z.number().int().min(1).max(72).default(24),
    }),
    z.object({
      mode: z.literal('record_payment'),
      amountMinor: z.number().int().positive(),
      method: z.enum(['cash', 'bank_transfer', 'card']),
      reference: z.string().min(2),
      note: z.string().optional(),
    }),
    z.object({
      mode: z.literal('pay_at_hotel'),
    }),
  ]),
  termsAcceptedByStaff: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms on behalf of the guest',
  }),
  idempotencyKey: z.string().min(8),
});

export type AdminCreateReservationInput = z.infer<
  typeof adminCreateReservationSchema
>;

export const adminEditDetailsSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(6, 'Valid phone number is required'),
  country: z.string().optional(),
  arrivalTime: z.string().optional(),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
  version: z.string().min(1, 'Version is required for concurrency control'),
  idempotencyKey: z.string().min(8),
});

export type AdminEditDetailsInput = z.infer<typeof adminEditDetailsSchema>;

export const adminReassignRoomSchema = z.object({
  roomId: z.string().uuid('Valid room ID is required'),
  note: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  idempotencyKey: z.string().min(8),
});

export type AdminReassignRoomInput = z.infer<typeof adminReassignRoomSchema>;

export const adminRecordPaymentSchema = z.object({
  amountMinor: z.number().int().min(100, 'Minimum payment is ₦1.00'),
  type: z.enum(['deposit', 'balance', 'full']),
  method: z.enum(['cash', 'bank_transfer', 'card']),
  reference: z.string().min(2, 'Payment reference is required'),
  paidAt: z.string().optional(),
  note: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  idempotencyKey: z.string().min(8),
});

export type AdminRecordPaymentInput = z.infer<typeof adminRecordPaymentSchema>;

export const adminVerifyTransferSchema = z.object({
  action: z.enum(['verify', 'reject']),
  amountMinor: z.number().int().positive().optional(),
  rejectionReason: z.string().optional(),
  note: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  idempotencyKey: z.string().min(8),
});

export type AdminVerifyTransferInput = z.infer<
  typeof adminVerifyTransferSchema
>;

export const adminApproveDeclineSchema = z.object({
  action: z.enum(['approve', 'decline']),
  reason: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  idempotencyKey: z.string().min(8),
});

export type AdminApproveDeclineInput = z.infer<
  typeof adminApproveDeclineSchema
>;

export const adminChangeDatesQuoteSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extraBed: z.boolean().optional(),
});

export type AdminChangeDatesQuoteInput = z.infer<
  typeof adminChangeDatesQuoteSchema
>;

export const adminChangeDatesSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomId: z.uuid().optional(),
  overrideRules: z.boolean().default(false),
  overrideReason: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  idempotencyKey: z.string().min(8),
});

export type AdminChangeDatesInput = z.infer<typeof adminChangeDatesSchema>;

export const adminCancelSchema = z.object({
  refundAmountMinor: z.number().int().min(0),
  overrideReason: z.string().optional(),
  reason: z.string().min(2, 'Cancellation reason is required'),
  note: z.string().optional(),
  doNotEmailGuest: z.boolean().default(false),
  version: z.string().min(1, 'Version is required'),
  idempotencyKey: z.string().min(8),
});

export type AdminCancelInput = z.infer<typeof adminCancelSchema>;

export const adminRefundSchema = z.object({
  paymentId: z.string().uuid('Valid payment ID is required'),
  amountMinor: z.number().int().positive('Refund amount must be positive'),
  reason: z.string().min(3, 'Refund reason is required'),
  method: z.enum(['provider', 'manual_bank', 'manual_cash']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  idempotencyKey: z.string().min(8),
});

export type AdminRefundInput = z.infer<typeof adminRefundSchema>;

export const adminNoShowSchema = z.object({
  refundAmountMinor: z.number().int().min(0).default(0),
  overrideReason: z.string().optional(),
  reason: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  idempotencyKey: z.string().min(8),
});

export type AdminNoShowInput = z.infer<typeof adminNoShowSchema>;

export const adminResendConfirmationSchema = z.object({
  templateKey: z.enum([
    'booking_confirmation',
    'payment_receipt',
    'cancellation_notice',
  ]),
  recipient: z.email('Valid recipient email is required'),
  idempotencyKey: z.string().min(8),
});

export type AdminResendConfirmationInput = z.infer<
  typeof adminResendConfirmationSchema
>;
