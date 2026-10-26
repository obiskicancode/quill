import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  bookingSourceEnum,
  confirmationModeEnum,
  extraPricingUnitEnum,
  paymentModeEnum,
  paymentProviderEnum,
  paymentStatusEnum,
  paymentTypeEnum,
  reservationStatusEnum,
} from './enums';
import { extras, rooms, roomTypes } from './rooms';
import { staffUsers } from './staff';

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reference: varchar('reference', { length: 20 }).notNull().unique(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'restrict' }),
    roomTypeId: uuid('room_type_id')
      .notNull()
      .references(() => roomTypes.id, { onDelete: 'restrict' }),
    guestName: varchar('guest_name', { length: 200 }).notNull(),
    guestEmail: varchar('guest_email', { length: 255 }),
    guestEmailMissing: boolean('guest_email_missing').notNull().default(false),
    guestPhone: varchar('guest_phone', { length: 30 }).notNull(),
    guestCountry: varchar('guest_country', { length: 2 }),
    arrivalTime: varchar('arrival_time', { length: 20 }),
    specialRequests: text('special_requests'),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    adults: smallint('adults').notNull().default(1),
    children: smallint('children').notNull().default(0),
    nights: smallint('nights').notNull(),
    status: reservationStatusEnum('status').notNull().default('pending'),
    bookingSource: bookingSourceEnum('booking_source')
      .notNull()
      .default('website'),
    paymentMode: paymentModeEnum('payment_mode')
      .notNull()
      .default('full_online'),
    confirmationMode: confirmationModeEnum('confirmation_mode')
      .notNull()
      .default('instant'),
    channel: varchar('channel', { length: 50 }),
    subtotalMinor: integer('subtotal_minor').notNull().default(0),
    extrasMinor: integer('extras_minor').notNull().default(0),
    discountMinor: integer('discount_minor').notNull().default(0),
    taxMinor: integer('tax_minor').notNull().default(0),
    serviceChargeMinor: integer('service_charge_minor').notNull().default(0),
    totalMinor: integer('total_minor').notNull().default(0),
    depositRequiredMinor: integer('deposit_required_minor')
      .notNull()
      .default(0),
    amountPaidMinor: integer('amount_paid_minor').notNull().default(0),
    amountRefundedMinor: integer('amount_refunded_minor').notNull().default(0),
    balanceMinor: integer('balance_minor').notNull().default(0),
    currency: varchar('currency', { length: 3 }).notNull().default('NGN'),
    holdExpiresAt: timestamp('hold_expires_at', { withTimezone: true }),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
    termsAcceptedIp: inet('terms_accepted_ip'),
    staffTermsAccepted: boolean('staff_terms_accepted')
      .notNull()
      .default(false),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    confirmedBy: uuid('confirmed_by').references(() => staffUsers.id),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    checkedOutAt: timestamp('checked_out_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    changeCount: smallint('change_count').notNull().default(0),
    snapshot: jsonb('snapshot'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_res_ref').on(table.reference),
    index('idx_res_room').on(table.roomId),
    index('idx_res_room_type').on(table.roomTypeId),
    index('idx_res_status').on(table.status),
    index('idx_res_dates').on(table.checkIn, table.checkOut),
    index('idx_res_guest_email').on(table.guestEmail),
    index('idx_res_hold').on(table.holdExpiresAt),
    index('idx_res_created').on(table.createdAt),
    index('idx_reservations_guest_phone').on(table.guestPhone),
    index('idx_reservations_status_check_in').on(table.status, table.checkIn),
    index('idx_reservations_status_check_out').on(table.status, table.checkOut),
    check('chk_res_dates', sql`${table.checkOut} > ${table.checkIn}`),
    check(
      'chk_res_guests',
      sql`${table.adults} >= 1 AND ${table.children} >= 0`,
    ),
    check(
      'chk_res_money',
      sql`${table.totalMinor} >= 0 AND ${table.amountPaidMinor} >= 0 AND ${table.amountRefundedMinor} >= 0 AND ${table.depositRequiredMinor} >= 0`,
    ),
    check(
      'chk_res_email',
      sql`${table.guestEmail} IS NOT NULL OR ${table.guestEmailMissing} = true`,
    ),
  ],
);

export const reservationNights = pgTable(
  'reservation_nights',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    rateMinor: integer('rate_minor').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_rn_res').on(table.reservationId)],
);

export const reservationExtras = pgTable('reservation_extras', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reservationId: uuid('reservation_id')
    .notNull()
    .references(() => reservations.id, { onDelete: 'cascade' }),
  extraId: uuid('extra_id').references(() => extras.id),
  name: varchar('name', { length: 150 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPriceMinor: integer('unit_price_minor').notNull(),
  totalMinor: integer('total_minor').notNull(),
  pricingUnit: extraPricingUnitEnum('pricing_unit')
    .notNull()
    .default('per_stay'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reservationStatusHistory = pgTable(
  'reservation_status_history',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    fromStatus: reservationStatusEnum('from_status'),
    toStatus: reservationStatusEnum('to_status').notNull(),
    reason: text('reason'),
    changedBy: uuid('changed_by').references(() => staffUsers.id),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_rsh_res').on(table.reservationId),
    index('idx_rsh_created').on(table.createdAt),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'restrict' }),
    reference: varchar('reference', { length: 50 }).notNull().unique(),
    provider: paymentProviderEnum('provider').notNull(),
    type: paymentTypeEnum('type').notNull().default('full'),
    status: paymentStatusEnum('status').notNull().default('pending'),
    amountMinor: integer('amount_minor').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('NGN'),
    feeMinor: integer('fee_minor').default(0),
    netAmountMinor: integer('net_amount_minor'),
    providerRef: varchar('provider_ref', { length: 150 }),
    providerResponse: jsonb('provider_response'),
    refundOfPaymentId: uuid('refund_of_payment_id'),
    channel: varchar('channel', { length: 50 }),
    ipAddress: inet('ip_address'),
    reconciled: boolean('reconciled').notNull().default(false),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
    reconciledBy: uuid('reconciled_by').references(() => staffUsers.id),
    note: text('note'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_pay_res').on(table.reservationId),
    index('idx_pay_ref').on(table.reference),
    index('idx_pay_status').on(table.status),
    index('idx_pay_provider').on(table.provider),
    index('idx_pay_created').on(table.createdAt),
    index('idx_payments_status_provider').on(table.status, table.provider),
    index('idx_payments_res_status').on(table.reservationId, table.status),
    check('chk_pay_amount', sql`${table.amountMinor} > 0`),
  ],
);

export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: paymentProviderEnum('provider').notNull(),
    eventId: varchar('event_id', { length: 150 }).notNull(),
    eventType: varchar('event_type', { length: 100 }),
    payload: jsonb('payload').notNull(),
    headers: jsonb('headers'),
    processed: boolean('processed').notNull().default(false),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_pwe_provider_event').on(table.provider, table.eventId),
    index('idx_pwe_processed').on(table.processed),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: varchar('key', { length: 255 }).notNull().unique(),
    method: varchar('method', { length: 10 }),
    path: varchar('path', { length: 255 }),
    requestHash: varchar('request_hash', { length: 64 }),
    response: jsonb('response'),
    statusCode: integer('status_code'),
    reservationId: uuid('reservation_id').references(() => reservations.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_ik_key').on(table.key),
    index('idx_ik_expires').on(table.expiresAt),
  ],
);

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reference: varchar('reference', { length: 20 }).notNull(),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    breakdown: jsonb('breakdown').notNull(),
    oldTotalMinor: integer('old_total_minor').notNull(),
    newTotalMinor: integer('new_total_minor').notNull(),
    settle: varchar('settle', { length: 10 }).notNull(),
    roomReassigned: boolean('room_reassigned').notNull().default(false),
    policy: jsonb('policy').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_quotes_ref').on(table.reference),
    index('idx_quotes_expires').on(table.expiresAt),
  ],
);

export const paymentProofs = pgTable(
  'payment_proofs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_pp_payment').on(table.paymentId)],
);

export const refunds = pgTable(
  'refunds',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id').references(() => payments.id),
    amountMinor: integer('amount_minor').notNull(),
    method: varchar('method', { length: 30 }).notNull().default('none'),
    status: varchar('status', { length: 30 }).notNull().default('none'),
    timeline: varchar('timeline', { length: 100 }),
    reason: text('reason'),
    providerRef: varchar('provider_ref', { length: 150 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_refunds_res').on(table.reservationId),
    index('idx_refunds_status').on(table.status),
  ],
);

export const reservationChanges = pgTable(
  'reservation_changes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    quoteId: uuid('quote_id').references(() => quotes.id, {
      onDelete: 'set null',
    }),
    newRoomId: uuid('new_room_id').references(() => rooms.id),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    breakdown: jsonb('breakdown').notNull(),
    totalMinor: integer('total_minor').notNull(),
    amountDueMinor: integer('amount_due_minor').notNull(),
    status: varchar('status', { length: 30 })
      .notNull()
      .default('awaiting_payment'),
    method: varchar('method', { length: 20 }),
    roomReassigned: boolean('room_reassigned').notNull().default(false),
    policy: jsonb('policy').notNull(),
    holdExpiresAt: timestamp('hold_expires_at', {
      withTimezone: true,
    }).notNull(),
    paymentId: uuid('payment_id').references(() => payments.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_rc_res').on(table.reservationId),
    index('idx_rc_status').on(table.status),
    index('idx_rc_hold').on(table.holdExpiresAt),
  ],
);
