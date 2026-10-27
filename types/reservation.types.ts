import type {
  AdminApproveDeclineInput as AdminApproveDeclineInputSchema,
  AdminCancelInput as AdminCancelInputSchema,
  AdminChangeDatesInput as AdminChangeDatesInputSchema,
  AdminChangeDatesQuoteInput as AdminChangeDatesQuoteInputSchema,
  AdminCreateReservationInput as AdminCreateReservationInputSchema,
  AdminEditDetailsInput as AdminEditDetailsInputSchema,
  AdminNoShowInput as AdminNoShowInputSchema,
  AdminReassignRoomInput as AdminReassignRoomInputSchema,
  AdminRecordPaymentInput as AdminRecordPaymentInputSchema,
  AdminRefundInput as AdminRefundInputSchema,
  AdminResendConfirmationInput as AdminResendConfirmationInputSchema,
  AdminVerifyTransferInput as AdminVerifyTransferInputSchema,
  ReservationsListQueryParams as ReservationsListQueryParamsSchema,
} from '@/schemas/reservation.schema';
import type { ActionGate } from '@/types/base.types';

export type ReservationsListQueryParams = ReservationsListQueryParamsSchema;
export type AdminCreateReservationInput = AdminCreateReservationInputSchema;
export type AdminEditDetailsInput = AdminEditDetailsInputSchema;
export type AdminReassignRoomInput = AdminReassignRoomInputSchema;
export type AdminRecordPaymentInput = AdminRecordPaymentInputSchema;
export type AdminVerifyTransferInput = AdminVerifyTransferInputSchema;
export type AdminApproveDeclineInput = AdminApproveDeclineInputSchema;
export type AdminChangeDatesQuoteInput = AdminChangeDatesQuoteInputSchema;
export type AdminChangeDatesInput = AdminChangeDatesInputSchema;
export type AdminCancelInput = AdminCancelInputSchema;
export type AdminRefundInput = AdminRefundInputSchema;
export type AdminNoShowInput = AdminNoShowInputSchema;
export type AdminResendConfirmationInput = AdminResendConfirmationInputSchema;

export type AdminReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'
  | 'expired';

export type PaymentState =
  'unpaid' | 'deposit_paid' | 'fully_paid' | 'refunded';

export type BookingSource = 'website' | 'admin' | 'phone' | 'walk_in';

export type DateFilterField = 'check_in' | 'check_out' | 'created_at';

export type QuickFilter =
  'arriving_today' | 'departing_today' | 'in_house' | 'needs_attention';

export type ReservationSortField =
  'check_in' | 'created_at' | 'total_minor' | 'guest_name';

export type SortOrder = 'asc' | 'desc';

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
  status: AdminReservationStatus;
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
  fromStatus: AdminReservationStatus | null;
  toStatus: AdminReservationStatus;
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
  status: AdminReservationStatus;
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
  allowedActions: AdminAllowedActions;
}

export interface AdminAllowedActions {
  edit_details: ActionGate;
  reassign_room: ActionGate;
  change_dates: ActionGate;
  cancel: ActionGate;
  record_payment: ActionGate;
  refund: ActionGate;
  verify_bank_transfer: ActionGate;
  approve: ActionGate;
  decline: ActionGate;
  no_show: ActionGate;
  resend_confirmation: ActionGate;
  check_in: ActionGate;
  check_out: ActionGate;
}

export interface ReservationNeighbors {
  prevId: string | null;
  nextId: string | null;
}

// -------------------------------------------------------------
// Action Request Schemas
// -------------------------------------------------------------
