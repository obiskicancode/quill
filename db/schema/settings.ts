import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const hotelSettings = pgTable(
  'hotel_settings',
  {
    id: smallint('id').primaryKey().default(1),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    legalName: varchar('legal_name', { length: 200 }),
    registrationNumber: varchar('registration_number', { length: 100 }),
    tagline: varchar('tagline', { length: 255 }),
    propertyType: varchar('property_type', { length: 50 }),
    yearEstablished: smallint('year_established'),
    description: text('description'),
    logoUrl: text('logo_url'),
    logoAlt: varchar('logo_alt', { length: 255 }),
    faviconUrl: text('favicon_url'),
    primaryColor: varchar('primary_color', { length: 9 }),
    secondaryColor: varchar('secondary_color', { length: 9 }),
    heroTitle: varchar('hero_title', { length: 255 }),
    heroSubtitle: varchar('hero_subtitle', { length: 255 }),
    heroImageUrl: text('hero_image_url'),
    heroImageAlt: varchar('hero_image_alt', { length: 255 }),
    defaultOgImageUrl: text('default_og_image_url'),
    address: text('address').notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 2 }).notNull().default('NG'),
    latitude: numeric('latitude', { precision: 9, scale: 6 }),
    longitude: numeric('longitude', { precision: 9, scale: 6 }),
    googleMapsUrl: text('google_maps_url'),
    googleMapsEmbedUrl: text('google_maps_embed_url'),
    directionsText: text('directions_text'),
    nearestAirportNote: text('nearest_airport_note'),
    publicPhones: text('public_phones')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    whatsappNumber: varchar('whatsapp_number', { length: 30 }),
    whatsappPrefillMessage: text('whatsapp_prefill_message').default(
      'Hello, I would like to enquire about a room.',
    ),
    publicEmail: varchar('public_email', { length: 255 }),
    contactFormRecipient: varchar('contact_form_recipient', { length: 255 }),
    receptionHours: varchar('reception_hours', { length: 150 }),
    googleReviewsUrl: text('google_reviews_url'),
    googleBusinessUrl: text('google_business_url'),
    enquiryResponseHours: smallint('enquiry_response_hours')
      .notNull()
      .default(24),
    timezone: varchar('timezone', { length: 64 })
      .notNull()
      .default('Africa/Lagos'),
    checkInTime: time('check_in_time').notNull().default('14:00'),
    checkOutTime: time('check_out_time').notNull().default('12:00'),
    earlyCheckinPolicy: text('early_checkin_policy'),
    lateCheckoutPolicy: text('late_checkout_policy'),
    cancellationPolicyType: text('cancellation_policy_type')
      .notNull()
      .default('moderate'),
    freeCancellationHours: smallint('free_cancellation_hours').default(48),
    afterDeadlineRule: jsonb('after_deadline_rule')
      .notNull()
      .default(sql`'{"kind":"first_night"}'::jsonb`),
    depositBps: smallint('deposit_bps').notNull().default(0),
    taxBps: smallint('tax_bps').notNull().default(750),
    serviceChargeBps: smallint('service_charge_bps').notNull().default(0),
    currency: varchar('currency', { length: 3 }).notNull().default('NGN'),
    currencyMinorUnit: smallint('currency_minor_unit').notNull().default(2),
    priceDisplayIncludesTax: boolean('price_display_includes_tax')
      .notNull()
      .default(false),
    childrenAllowed: boolean('children_allowed').notNull().default(true),
    maxGuestsPerRoomDefault: smallint('max_guests_per_room_default')
      .notNull()
      .default(2),
    extraBedAllowed: boolean('extra_bed_allowed').notNull().default(false),
    extraBedPriceMinor: integer('extra_bed_price_minor'),
    idRequiredAtCheckIn: boolean('id_required_at_check_in')
      .notNull()
      .default(true),
    idRequirementText: text('id_requirement_text'),
    houseRules: text('house_rules')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    petsAllowed: boolean('pets_allowed').notNull().default(false),
    petsPolicyText: text('pets_policy_text'),
    smokingPolicy: varchar('smoking_policy', { length: 20 })
      .notNull()
      .default('non_smoking'),
    minLeadTimeHours: smallint('min_lead_time_hours').notNull().default(2),
    maxAdvanceBookingDays: integer('max_advance_booking_days')
      .notNull()
      .default(365),
    minNights: smallint('min_nights').notNull().default(1),
    maxNights: smallint('max_nights').notNull().default(30),
    sameDayCutoff: varchar('same_day_cutoff', { length: 5 })
      .notNull()
      .default('18:00'),
    siteConfig: jsonb('site_config'),
    manageSettings: jsonb('manage_settings'),
    policySettings: jsonb('policy_settings'),
    holdMinutes: smallint('hold_minutes').notNull().default(15),
    autoExpireHolds: boolean('auto_expire_holds').notNull().default(true),
    confirmationModeDefault: text('confirmation_mode_default')
      .notNull()
      .default('instant'),
    allowGuestCancellation: boolean('allow_guest_cancellation')
      .notNull()
      .default(true),
    guestCancelCutoffHours: smallint('guest_cancel_cutoff_hours').default(48),
    refundBpsAfterWindow: smallint('refund_bps_after_window')
      .notNull()
      .default(0),
    requireTransferProof: boolean('require_transfer_proof')
      .notNull()
      .default(true),
    allowOnlinePayment: boolean('allow_online_payment').notNull().default(true),
    allowPayAtHotel: boolean('allow_pay_at_hotel').notNull().default(true),
    allowBankTransfer: boolean('allow_bank_transfer').notNull().default(true),
    guestSelfServiceChangeDates: boolean('guest_self_service_change_dates')
      .notNull()
      .default(true),
    guestSelfServiceCancel: boolean('guest_self_service_cancel')
      .notNull()
      .default(true),
    guestSelfServiceAddExtras: boolean('guest_self_service_add_extras')
      .notNull()
      .default(false),
    enquiryResponseHoursDisplay: smallint('enquiry_response_hours_display')
      .notNull()
      .default(24),
    heroCtaText: varchar('hero_cta_text', { length: 50 }).default(
      'Book direct',
    ),
    maintenanceMode: boolean('maintenance_mode').notNull().default(false),
    analytics: jsonb('analytics'),
    consent: jsonb('consent'),
    social: jsonb('social'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('hotel_settings_singleton', sql`${table.id} = 1`),
    check(
      'chk_bps',
      sql`${table.taxBps} BETWEEN 0 AND 10000 AND ${table.serviceChargeBps} BETWEEN 0 AND 10000 AND ${table.depositBps} BETWEEN 0 AND 10000 AND ${table.refundBpsAfterWindow} BETWEEN 0 AND 10000`,
    ),
  ],
);

export const bankAccounts = pgTable('bank_accounts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  bankName: varchar('bank_name', { length: 150 }).notNull(),
  accountName: varchar('account_name', { length: 200 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  sortCode: varchar('sort_code', { length: 20 }),
  iban: varchar('iban', { length: 50 }),
  swiftBic: varchar('swift_bic', { length: 20 }),
  currency: varchar('currency', { length: 3 }).notNull().default('NGN'),
  instructions: text('instructions'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const socialLinks = pgTable('social_links', {
  id: varchar('id', { length: 36 }).primaryKey(),
  platform: varchar('platform', { length: 50 }).notNull(),
  url: text('url').notNull(),
  label: varchar('label', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
