import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';

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

export const createReservationSchema = z.object({
  checkIn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MESSAGES.INVALID_CHECKIN_DATE),
  checkOut: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MESSAGES.INVALID_CHECKOUT_DATE),
  adults: z.number().int().min(1, ERROR_MESSAGES.AT_LEAST_ONE_ADULT_REQUIRED),
  children: z.number().int().min(0).default(0),
  roomTypeId: z.string().uuid(ERROR_MESSAGES.INVALID_ROOM_TYPE_ID),
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
    fullName: z.string().min(2, ERROR_MESSAGES.NAME_MIN_TWO),
    email: z
      .string()
      .email(ERROR_MESSAGES.INVALID_EMAIL_ADDRESS)
      .optional()
      .or(z.literal('')),
    phone: z.string().min(6, ERROR_MESSAGES.PHONE_INVALID),
    country: z.string().default('NG'),
    arrivalTime: z.string().optional(),
    specialRequests: z.string().optional(),
  }),
  noEmail: z.boolean().default(false),
  internalNotes: z.string().optional(),
  enquiryId: z.string().uuid().optional(),
  source: z.enum(['phone', 'walk_in', 'admin']).default('phone'),
  discount: z
    .object({
      type: z.enum(['fixed', 'percentage']),
      value: z.number().positive(),
      reason: z.string().min(3, ERROR_MESSAGES.DISCOUNT_REASON_REQUIRED),
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
    message: ERROR_MESSAGES.STAFF_TERMS_REQUIRED,
  }),
  idempotencyKey: z.string().min(8),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const editDetailsSchema = z.object({
  fullName: z.string().min(2, ERROR_MESSAGES.NAME_MIN_TWO),
  email: z
    .string()
    .email(ERROR_MESSAGES.INVALID_EMAIL_ADDRESS)
    .optional()
    .or(z.literal('')),
  phone: z.string().min(6, ERROR_MESSAGES.PHONE_INVALID),
  country: z.string().optional(),
  arrivalTime: z.string().optional(),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
  version: z.string().min(1, ERROR_MESSAGES.VERSION_REQUIRED_CONCURRENCY),
  idempotencyKey: z.string().min(8),
});

export type EditDetailsInput = z.infer<typeof editDetailsSchema>;

export const reassignRoomSchema = z.object({
  roomId: z.string().uuid(ERROR_MESSAGES.VALID_ROOM_ID_REQUIRED),
  note: z.string().optional(),
  version: z.string().min(1, ERROR_MESSAGES.VERSION_REQUIRED),
  idempotencyKey: z.string().min(8),
});

export type ReassignRoomInput = z.infer<typeof reassignRoomSchema>;

export const recordPaymentSchema = z.object({
  amountMinor: z.number().int().min(100, ERROR_MESSAGES.MINIMUM_PAYMENT),
  type: z.enum(['deposit', 'balance', 'full']),
  method: z.enum(['cash', 'bank_transfer', 'card']),
  reference: z.string().min(2, ERROR_MESSAGES.PAYMENT_REFERENCE_REQUIRED),
  paidAt: z.string().optional(),
  note: z.string().optional(),
  version: z.string().min(1, ERROR_MESSAGES.VERSION_REQUIRED),
  idempotencyKey: z.string().min(8),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const verifyTransferSchema = z.object({
  action: z.enum(['verify', 'reject']),
  amountMinor: z.number().int().positive().optional(),
  rejectionReason: z.string().optional(),
  note: z.string().optional(),
  version: z.string().min(1, ERROR_MESSAGES.VERSION_REQUIRED),
  idempotencyKey: z.string().min(8),
});

export type VerifyTransferInput = z.infer<typeof verifyTransferSchema>;

export const approveDeclineSchema = z.object({
  action: z.enum(['approve', 'decline']),
  reason: z.string().optional(),
  version: z.string().min(1, ERROR_MESSAGES.VERSION_REQUIRED),
  idempotencyKey: z.string().min(8),
});

export type ApproveDeclineInput = z.infer<typeof approveDeclineSchema>;

export const changeDatesQuoteSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extraBed: z.boolean().optional(),
});

export type ChangeDatesQuoteInput = z.infer<typeof changeDatesQuoteSchema>;

export const changeDatesSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomId: z.uuid().optional(),
  overrideRules: z.boolean().default(false),
  overrideReason: z.string().optional(),
  version: z.string().min(1, ERROR_MESSAGES.VERSION_REQUIRED),
  idempotencyKey: z.string().min(8),
});

export type changeDatesInput = z.infer<typeof changeDatesSchema>;

export const cancelSchema = z.object({
  refundAmountMinor: z.number().int().min(0),
  overrideReason: z.string().optional(),
  reason: z.string().min(2, ERROR_MESSAGES.CANCELLATION_REASON_REQUIRED),
  note: z.string().optional(),
  doNotEmailGuest: z.boolean().default(false),
  version: z.string().min(1, ERROR_MESSAGES.VERSION_REQUIRED),
  idempotencyKey: z.string().min(8),
});

export type CancelInput = z.infer<typeof cancelSchema>;

export const refundSchema = z.object({
  paymentId: z.string().uuid(ERROR_MESSAGES.VALID_PAYMENT_ID_REQUIRED),
  amountMinor: z.number().int().positive(ERROR_MESSAGES.REFUND_AMOUNT_POSITIVE),
  reason: z.string().min(3, ERROR_MESSAGES.REFUND_REASON_REQUIRED),
  method: z.enum(['provider', 'manual_bank', 'manual_cash']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  version: z.string().min(1, ERROR_MESSAGES.VERSION_REQUIRED),
  idempotencyKey: z.string().min(8),
});

export type RefundInput = z.infer<typeof refundSchema>;

export const noShowSchema = z.object({
  refundAmountMinor: z.number().int().min(0).default(0),
  overrideReason: z.string().optional(),
  reason: z.string().optional(),
  version: z.string().min(1, ERROR_MESSAGES.VERSION_REQUIRED),
  idempotencyKey: z.string().min(8),
});

export type NoShowInput = z.infer<typeof noShowSchema>;

export const resendConfirmationSchema = z.object({
  templateKey: z.enum([
    'booking_confirmation',
    'payment_receipt',
    'cancellation_notice',
  ]),
  recipient: z.email(ERROR_MESSAGES.VALID_RECIPIENT_EMAIL_REQUIRED),
  idempotencyKey: z.string().min(8),
});

export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>;
