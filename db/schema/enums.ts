import { pgEnum } from 'drizzle-orm/pg-core';

export const staffRoleEnum = pgEnum('staff_role', [
  'owner',
  'manager',
  'reception',
]);

export const tokenPurposeEnum = pgEnum('token_purpose', ['reset', 'invite']);

export const roomStatusEnum = pgEnum('room_status', [
  'active',
  'maintenance',
  'inactive',
]);

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
  'expired',
]);

export const bookingSourceEnum = pgEnum('booking_source', [
  'website',
  'admin',
  'phone',
  'walk_in',
]);

export const paymentModeEnum = pgEnum('payment_mode', [
  'full_online',
  'deposit_online',
  'pay_at_hotel',
]);

export const confirmationModeEnum = pgEnum('confirmation_mode', [
  'instant',
  'manual_approval',
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'paystack',
  'flutterwave',
  'stripe',
  'bank_transfer',
  'cash',
]);

export const paymentTypeEnum = pgEnum('payment_type', [
  'deposit',
  'balance',
  'full',
  'refund',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
]);

export const cancellationPolicyTypeEnum = pgEnum('cancellation_policy_type', [
  'flexible',
  'moderate',
  'strict',
  'non_refundable',
  'custom',
]);

export const rateAdjustmentTypeEnum = pgEnum('rate_adjustment_type', [
  'fixed_price',
  'percent_markup',
  'amount_markup',
]);

export const blockReasonEnum = pgEnum('block_reason', [
  'maintenance',
  'owner_hold',
  'renovation',
  'other',
]);

export const extraPricingUnitEnum = pgEnum('extra_pricing_unit', [
  'per_stay',
  'per_night',
  'per_guest',
  'per_guest_per_night',
]);

export const enquiryTypeEnum = pgEnum('enquiry_type', [
  'booking_enquiry',
  'general',
  'group_booking',
  'event_conference',
  'corporate',
  'complaint_feedback',
]);

export const enquiryStatusEnum = pgEnum('enquiry_status', [
  'new',
  'replied',
  'closed',
  'converted',
]);

export const galleryCategoryEnum = pgEnum('gallery_category', [
  'rooms',
  'facilities',
  'exterior',
  'dining',
  'events',
  'surroundings',
  'other',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'whatsapp',
  'sms',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'failed',
]);
