CREATE TYPE "public"."block_reason" AS ENUM(
  'maintenance',
  'owner_hold',
  'renovation',
  'other'
);

CREATE TYPE "public"."booking_source" AS ENUM('website', 'admin', 'phone', 'walk_in');

CREATE TYPE "public"."cancellation_policy_type" AS ENUM(
  'flexible',
  'moderate',
  'strict',
  'non_refundable',
  'custom'
);

CREATE TYPE "public"."confirmation_mode" AS ENUM('instant', 'manual_approval');

CREATE TYPE "public"."enquiry_status" AS ENUM('new', 'replied', 'closed', 'converted');

CREATE TYPE "public"."enquiry_type" AS ENUM(
  'booking_enquiry',
  'general',
  'group_booking',
  'event_conference',
  'corporate',
  'complaint_feedback'
);

CREATE TYPE "public"."extra_pricing_unit" AS ENUM(
  'per_stay',
  'per_night',
  'per_guest',
  'per_guest_per_night'
);

CREATE TYPE "public"."gallery_category" AS ENUM(
  'rooms',
  'facilities',
  'exterior',
  'dining',
  'events',
  'surroundings',
  'other'
);

CREATE TYPE "public"."notification_channel" AS ENUM('email', 'whatsapp', 'sms');

CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed');

CREATE TYPE "public"."payment_mode" AS ENUM('full_online', 'deposit_online', 'pay_at_hotel');

CREATE TYPE "public"."payment_provider" AS ENUM(
  'paystack',
  'flutterwave',
  'stripe',
  'bank_transfer',
  'cash'
);

CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');

CREATE TYPE "public"."payment_type" AS ENUM('deposit', 'balance', 'full', 'refund');

CREATE TYPE "public"."rate_adjustment_type" AS ENUM('fixed_price', 'percent_markup', 'amount_markup');

CREATE TYPE "public"."reservation_status" AS ENUM(
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
  'expired'
);

CREATE TYPE "public"."room_status" AS ENUM('active', 'maintenance', 'inactive');

CREATE TYPE "public"."staff_role" AS ENUM('owner', 'manager', 'reception');

CREATE TYPE "public"."token_purpose" AS ENUM('reset', 'invite');

CREATE TABLE "bank_accounts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "bank_name" varchar(150) NOT NULL,
  "account_name" varchar(200) NOT NULL,
  "account_number" varchar(50) NOT NULL,
  "sort_code" varchar(20),
  "iban" varchar(50),
  "swift_bic" varchar(20),
  "currency" varchar(3) DEFAULT 'NGN' NOT NULL,
  "instructions" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "hotel_settings" (
  "id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
  "display_name" varchar(200) NOT NULL,
  "legal_name" varchar(200),
  "registration_number" varchar(100),
  "tagline" varchar(255),
  "property_type" varchar(50),
  "year_established" smallint,
  "description" text,
  "logo_url" text,
  "logo_alt" varchar(255),
  "favicon_url" text,
  "primary_color" varchar(9),
  "secondary_color" varchar(9),
  "hero_title" varchar(255),
  "hero_subtitle" varchar(255),
  "hero_image_url" text,
  "hero_image_alt" varchar(255),
  "default_og_image_url" text,
  "address" text NOT NULL,
  "city" varchar(100) NOT NULL,
  "state" varchar(100),
  "country" varchar(2) DEFAULT 'NG' NOT NULL,
  "latitude" numeric(9, 6),
  "longitude" numeric(9, 6),
  "google_maps_url" text,
  "google_maps_embed_url" text,
  "directions_text" text,
  "nearest_airport_note" text,
  "public_phones" text[] DEFAULT '{}'::text[] NOT NULL,
  "whatsapp_number" varchar(30),
  "whatsapp_prefill_message" text DEFAULT 'Hello, I would like to enquire about a room.',
  "public_email" varchar(255),
  "contact_form_recipient" varchar(255),
  "reception_hours" varchar(150),
  "google_reviews_url" text,
  "google_business_url" text,
  "enquiry_response_hours" smallint DEFAULT 24 NOT NULL,
  "timezone" varchar(64) DEFAULT 'Africa/Lagos' NOT NULL,
  "check_in_time" time DEFAULT '14:00' NOT NULL,
  "check_out_time" time DEFAULT '12:00' NOT NULL,
  "early_checkin_policy" text,
  "late_checkout_policy" text,
  "cancellation_policy_type" text DEFAULT 'moderate' NOT NULL,
  "free_cancellation_hours" smallint DEFAULT 48,
  "after_deadline_rule" jsonb DEFAULT '{"kind":"first_night"}'::jsonb NOT NULL,
  "deposit_bps" smallint DEFAULT 0 NOT NULL,
  "tax_bps" smallint DEFAULT 750 NOT NULL,
  "service_charge_bps" smallint DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN' NOT NULL,
  "currency_minor_unit" smallint DEFAULT 2 NOT NULL,
  "price_display_includes_tax" boolean DEFAULT false NOT NULL,
  "children_allowed" boolean DEFAULT true NOT NULL,
  "max_guests_per_room_default" smallint DEFAULT 2 NOT NULL,
  "extra_bed_allowed" boolean DEFAULT false NOT NULL,
  "extra_bed_price_minor" integer,
  "id_required_at_check_in" boolean DEFAULT true NOT NULL,
  "id_requirement_text" text,
  "house_rules" text[] DEFAULT '{}'::text[] NOT NULL,
  "pets_allowed" boolean DEFAULT false NOT NULL,
  "pets_policy_text" text,
  "smoking_policy" varchar(20) DEFAULT 'non_smoking' NOT NULL,
  "min_lead_time_hours" smallint DEFAULT 2 NOT NULL,
  "max_advance_booking_days" integer DEFAULT 365 NOT NULL,
  "hold_minutes" smallint DEFAULT 15 NOT NULL,
  "auto_expire_holds" boolean DEFAULT true NOT NULL,
  "confirmation_mode_default" text DEFAULT 'instant' NOT NULL,
  "allow_guest_cancellation" boolean DEFAULT true NOT NULL,
  "guest_cancel_cutoff_hours" smallint DEFAULT 48,
  "refund_bps_after_window" smallint DEFAULT 0 NOT NULL,
  "require_transfer_proof" boolean DEFAULT true NOT NULL,
  "allow_online_payment" boolean DEFAULT true NOT NULL,
  "allow_pay_at_hotel" boolean DEFAULT true NOT NULL,
  "allow_bank_transfer" boolean DEFAULT true NOT NULL,
  "guest_self_service_change_dates" boolean DEFAULT true NOT NULL,
  "guest_self_service_cancel" boolean DEFAULT true NOT NULL,
  "guest_self_service_add_extras" boolean DEFAULT false NOT NULL,
  "enquiry_response_hours_display" smallint DEFAULT 24 NOT NULL,
  "hero_cta_text" varchar(50) DEFAULT 'Book direct',
  "maintenance_mode" boolean DEFAULT false NOT NULL,
  "analytics" jsonb,
  "consent" jsonb,
  "social" jsonb,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "hotel_settings_singleton" CHECK ("hotel_settings"."id" = 1),
  CONSTRAINT "chk_bps" CHECK (
    "hotel_settings"."tax_bps" BETWEEN 0 AND 10000
    AND "hotel_settings"."service_charge_bps" BETWEEN 0 AND 10000
    AND "hotel_settings"."deposit_bps" BETWEEN 0 AND 10000
    AND "hotel_settings"."refund_bps_after_window" BETWEEN 0 AND 10000
  )
);

CREATE TABLE "social_links" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "platform" varchar(50) NOT NULL,
  "url" text NOT NULL,
  "label" varchar(100),
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "staff_user_id" uuid NOT NULL,
  "token_hash" varchar(255) NOT NULL,
  "purpose" "token_purpose" DEFAULT 'reset' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "requested_ip" "inet",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE ("token_hash")
);

CREATE TABLE "staff_recovery_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "staff_user_id" uuid NOT NULL,
  "code_hash" varchar(255) NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "staff_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "staff_user_id" uuid NOT NULL,
  "session_token_hash" varchar(255) NOT NULL,
  "user_agent" text,
  "ip_address" "inet",
  "device_info" jsonb,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "step_up_verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "staff_sessions_session_token_hash_unique" UNIQUE ("session_token_hash")
);

CREATE TABLE "staff_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" varchar(255),
  "first_name" varchar(100) NOT NULL,
  "last_name" varchar(100) NOT NULL,
  "role" "staff_role" DEFAULT 'reception' NOT NULL,
  "phone" varchar(30),
  "is_active" boolean DEFAULT true NOT NULL,
  "invited_at" timestamp with time zone,
  "invited_by" uuid,
  "invite_expires_at" timestamp with time zone,
  "last_login_at" timestamp with time zone,
  "last_login_ip" "inet",
  "mfa_enabled" boolean DEFAULT false NOT NULL,
  "mfa_secret_encrypted" text,
  "deactivated_at" timestamp with time zone,
  "deactivated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "staff_users_email_unique" UNIQUE ("email")
);

CREATE TABLE "amenities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(50) NOT NULL,
  "label" varchar(100) NOT NULL,
  "icon" varchar(50),
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "amenities_key_unique" UNIQUE ("key")
);

CREATE TABLE "extras" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(150) NOT NULL,
  "slug" varchar(150) NOT NULL,
  "description" text,
  "price_minor" integer DEFAULT 0 NOT NULL,
  "pricing_unit" "extra_pricing_unit" DEFAULT 'per_stay' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "extras_slug_unique" UNIQUE ("slug")
);

CREATE TABLE "rate_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_type_id" uuid,
  "name" varchar(150) NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "min_nights" smallint DEFAULT 1,
  "max_nights" smallint,
  "days_of_week" smallint[],
  "adjustment_type" "rate_adjustment_type" NOT NULL,
  "adjustment_value" integer NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_rule_dates" CHECK (
    "rate_rules"."end_date" >= "rate_rules"."start_date"
  )
);

CREATE TABLE "room_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "reason" "block_reason" DEFAULT 'maintenance' NOT NULL,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_block_dates" CHECK (
    "room_blocks"."end_date" > "room_blocks"."start_date"
  )
);

CREATE TABLE "room_type_amenities" (
  "room_type_id" uuid NOT NULL,
  "amenity_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "room_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(150) NOT NULL,
  "slug" varchar(150) NOT NULL,
  "short_description" text,
  "description" text,
  "bed_config" varchar(100),
  "max_adults" smallint DEFAULT 2 NOT NULL,
  "max_children" smallint DEFAULT 0 NOT NULL,
  "max_occupancy" smallint DEFAULT 2 NOT NULL,
  "base_price_minor" integer DEFAULT 0 NOT NULL,
  "weekend_price_minor" integer,
  "extra_adult_price_minor" integer DEFAULT 0,
  "extra_child_price_minor" integer DEFAULT 0,
  "size_sqm" numeric(6, 2),
  "floor_info" varchar(50),
  "smoking_allowed" boolean DEFAULT false NOT NULL,
  "pets_allowed" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "meta_title" varchar(160),
  "meta_description" varchar(320),
  "cover_image_url" text,
  "cover_image_alt" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "room_types_slug_unique" UNIQUE ("slug"),
  CONSTRAINT "chk_rt_price" CHECK (
    "room_types"."base_price_minor" >= 0
    AND "room_types"."max_adults" >= 1
  )
);

CREATE TABLE "rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_type_id" uuid NOT NULL,
  "room_number" varchar(20) NOT NULL,
  "floor" varchar(20),
  "status" "room_status" DEFAULT 'active' NOT NULL,
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "idempotency_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(255) NOT NULL,
  "method" varchar(10),
  "path" varchar(255),
  "request_hash" varchar(64),
  "response" jsonb,
  "status_code" integer,
  "reservation_id" uuid,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "idempotency_keys_key_unique" UNIQUE ("key")
);

CREATE TABLE "payment_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" "payment_provider" NOT NULL,
  "event_id" varchar(150) NOT NULL,
  "event_type" varchar(100),
  "payload" jsonb NOT NULL,
  "headers" jsonb,
  "processed" boolean DEFAULT false NOT NULL,
  "processed_at" timestamp with time zone,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_id" uuid NOT NULL,
  "reference" varchar(50) NOT NULL,
  "provider" "payment_provider" NOT NULL,
  "type" "payment_type" DEFAULT 'full' NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "amount_minor" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN' NOT NULL,
  "fee_minor" integer DEFAULT 0,
  "net_amount_minor" integer,
  "provider_ref" varchar(150),
  "provider_response" jsonb,
  "refund_of_payment_id" uuid,
  "channel" varchar(50),
  "ip_address" "inet",
  "reconciled" boolean DEFAULT false NOT NULL,
  "reconciled_at" timestamp with time zone,
  "reconciled_by" uuid,
  "note" text,
  "paid_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payments_reference_unique" UNIQUE ("reference"),
  CONSTRAINT "chk_pay_amount" CHECK ("payments"."amount_minor" > 0)
);

CREATE TABLE "reservation_extras" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_id" uuid NOT NULL,
  "extra_id" uuid,
  "name" varchar(150) NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_price_minor" integer NOT NULL,
  "total_minor" integer NOT NULL,
  "pricing_unit" "extra_pricing_unit" DEFAULT 'per_stay' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "reservation_nights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_id" uuid NOT NULL,
  "date" date NOT NULL,
  "rate_minor" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "reservation_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_id" uuid NOT NULL,
  "from_status" "reservation_status",
  "to_status" "reservation_status" NOT NULL,
  "reason" text,
  "changed_by" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(20) NOT NULL,
  "room_id" uuid NOT NULL,
  "room_type_id" uuid NOT NULL,
  "guest_name" varchar(200) NOT NULL,
  "guest_email" varchar(255),
  "guest_email_missing" boolean DEFAULT false NOT NULL,
  "guest_phone" varchar(30) NOT NULL,
  "guest_country" varchar(2),
  "arrival_time" varchar(20),
  "special_requests" text,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "adults" smallint DEFAULT 1 NOT NULL,
  "children" smallint DEFAULT 0 NOT NULL,
  "nights" smallint NOT NULL,
  "status" "reservation_status" DEFAULT 'pending' NOT NULL,
  "booking_source" "booking_source" DEFAULT 'website' NOT NULL,
  "payment_mode" "payment_mode" DEFAULT 'full_online' NOT NULL,
  "confirmation_mode" "confirmation_mode" DEFAULT 'instant' NOT NULL,
  "channel" varchar(50),
  "subtotal_minor" integer DEFAULT 0 NOT NULL,
  "extras_minor" integer DEFAULT 0 NOT NULL,
  "discount_minor" integer DEFAULT 0 NOT NULL,
  "tax_minor" integer DEFAULT 0 NOT NULL,
  "service_charge_minor" integer DEFAULT 0 NOT NULL,
  "total_minor" integer DEFAULT 0 NOT NULL,
  "deposit_required_minor" integer DEFAULT 0 NOT NULL,
  "amount_paid_minor" integer DEFAULT 0 NOT NULL,
  "amount_refunded_minor" integer DEFAULT 0 NOT NULL,
  "balance_minor" integer DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN' NOT NULL,
  "hold_expires_at" timestamp with time zone,
  "terms_accepted_at" timestamp with time zone,
  "terms_accepted_ip" "inet",
  "staff_terms_accepted" boolean DEFAULT false NOT NULL,
  "confirmed_at" timestamp with time zone,
  "confirmed_by" uuid,
  "checked_in_at" timestamp with time zone,
  "checked_out_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "cancellation_reason" text,
  "change_count" smallint DEFAULT 0 NOT NULL,
  "snapshot" jsonb,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reservations_reference_unique" UNIQUE ("reference"),
  CONSTRAINT "chk_res_dates" CHECK (
    "reservations"."check_out" > "reservations"."check_in"
  ),
  CONSTRAINT "chk_res_guests" CHECK (
    "reservations"."adults" >= 1
    AND "reservations"."children" >= 0
  ),
  CONSTRAINT "chk_res_money" CHECK (
    "reservations"."total_minor" >= 0
    AND "reservations"."amount_paid_minor" >= 0
    AND "reservations"."amount_refunded_minor" >= 0
    AND "reservations"."deposit_required_minor" >= 0
  ),
  CONSTRAINT "chk_res_email" CHECK (
    "reservations"."guest_email" IS NOT NULL
    OR "reservations"."guest_email_missing" = true
  )
);

CREATE TABLE "enquiries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "enquiry_type" DEFAULT 'general' NOT NULL,
  "name" varchar(200) NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(30),
  "subject" varchar(200),
  "message" text NOT NULL,
  "check_in" date,
  "check_out" date,
  "guests" integer,
  "room_type_interest" varchar(150),
  "status" "enquiry_status" DEFAULT 'new' NOT NULL,
  "source" varchar(50),
  "ip_address" "inet",
  "user_agent" text,
  "is_spam" boolean DEFAULT false NOT NULL,
  "read_at" timestamp with time zone,
  "anonymised_at" timestamp with time zone,
  "converted_reservation_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "enquiry_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enquiry_id" uuid NOT NULL,
  "staff_user_id" uuid,
  "note" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "enquiry_replies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enquiry_id" uuid NOT NULL,
  "staff_user_id" uuid,
  "message" text NOT NULL,
  "sent_via" varchar(20) DEFAULT 'email',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "facilities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(150) NOT NULL,
  "slug" varchar(150) NOT NULL,
  "description" text,
  "icon" varchar(50),
  "image_url" text,
  "image_alt" varchar(255),
  "storage_key" varchar(255),
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "facilities_slug_unique" UNIQUE ("slug")
);

CREATE TABLE "faqs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question" varchar(255) NOT NULL,
  "answer" text NOT NULL,
  "category" varchar(50),
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "gallery_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category" "gallery_category" DEFAULT 'other' NOT NULL,
  "title" varchar(150),
  "alt_text" varchar(255) NOT NULL,
  "image_url" text NOT NULL,
  "storage_key" varchar(255),
  "caption" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "nearby_attractions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(150) NOT NULL,
  "distance" varchar(50),
  "description" text,
  "image_url" text,
  "image_alt" varchar(255),
  "storage_key" varchar(255),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "site_page_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "page_id" uuid NOT NULL,
  "content" jsonb NOT NULL,
  "edited_by" uuid,
  "note" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "site_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(150) NOT NULL,
  "title" varchar(200) NOT NULL,
  "template" varchar(50) DEFAULT 'default',
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "meta_title" varchar(160),
  "meta_description" varchar(320),
  "og_image_url" text,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "site_pages_slug_unique" UNIQUE ("slug")
);

CREATE TABLE "team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(150) NOT NULL,
  "role" varchar(100),
  "bio" text,
  "image_url" text,
  "image_alt" varchar(255),
  "storage_key" varchar(255),
  "email" varchar(255),
  "phone" varchar(30),
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "testimonials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "guest_name" varchar(150) NOT NULL,
  "location" varchar(100),
  "quote" text NOT NULL,
  "rating" integer,
  "stay_type" varchar(50),
  "is_featured" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "image_url" text,
  "image_alt" varchar(255),
  "storage_key" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notification_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_id" uuid,
  "template_key" varchar(100),
  "channel" "notification_channel" NOT NULL,
  "recipient" varchar(255) NOT NULL,
  "subject" varchar(255),
  "body" text,
  "status" "notification_status" DEFAULT 'queued' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_attempt_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "error" text,
  "provider_response" jsonb,
  "dedupe_key" varchar(100),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notification_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_key" varchar(100) NOT NULL,
  "recipient_type" varchar(20) NOT NULL,
  "email" varchar(255),
  "phone" varchar(30),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notification_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(100) NOT NULL,
  "name" varchar(150) NOT NULL,
  "channel" "notification_channel" NOT NULL,
  "subject" varchar(255),
  "body" text NOT NULL,
  "variables" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_templates_key_unique" UNIQUE ("key")
);

CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid,
  "actor_role" "staff_role",
  "entity" varchar(50) NOT NULL,
  "entity_id" varchar(64) NOT NULL,
  "action" varchar(30) NOT NULL,
  "reason" text,
  "changes" jsonb,
  "ip_address" "inet",
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "seed_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "table_name" varchar(64) NOT NULL,
  "row_id" varchar(64) NOT NULL,
  "seed_name" varchar(50) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "password_reset_tokens"
ADD CONSTRAINT "password_reset_tokens_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "staff_recovery_codes"
ADD CONSTRAINT "staff_recovery_codes_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "staff_sessions"
ADD CONSTRAINT "staff_sessions_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "rate_rules"
ADD CONSTRAINT "rate_rules_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "room_blocks"
ADD CONSTRAINT "room_blocks_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "room_type_amenities"
ADD CONSTRAINT "room_type_amenities_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "room_type_amenities"
ADD CONSTRAINT "room_type_amenities_amenity_id_amenities_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "rooms"
ADD CONSTRAINT "rooms_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types" ("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "idempotency_keys"
ADD CONSTRAINT "idempotency_keys_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations" ("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_reconciled_by_staff_users_id_fk" FOREIGN KEY ("reconciled_by") REFERENCES "public"."staff_users" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "reservation_extras"
ADD CONSTRAINT "reservation_extras_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "reservation_extras"
ADD CONSTRAINT "reservation_extras_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "reservation_nights"
ADD CONSTRAINT "reservation_nights_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "reservation_status_history"
ADD CONSTRAINT "reservation_status_history_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "reservation_status_history"
ADD CONSTRAINT "reservation_status_history_changed_by_staff_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."staff_users" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms" ("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types" ("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_confirmed_by_staff_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."staff_users" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "enquiry_notes"
ADD CONSTRAINT "enquiry_notes_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "enquiry_notes"
ADD CONSTRAINT "enquiry_notes_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "enquiry_replies"
ADD CONSTRAINT "enquiry_replies_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "enquiry_replies"
ADD CONSTRAINT "enquiry_replies_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "site_page_revisions"
ADD CONSTRAINT "site_page_revisions_page_id_site_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."site_pages" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "site_page_revisions"
ADD CONSTRAINT "site_page_revisions_edited_by_staff_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."staff_users" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "notification_logs"
ADD CONSTRAINT "notification_logs_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "notification_templates"
ADD CONSTRAINT "notification_templates_updated_by_staff_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."staff_users" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_actor_id_staff_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."staff_users" ("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "idx_prt_user" ON "password_reset_tokens" USING btree ("staff_user_id");

CREATE INDEX "idx_prt_token" ON "password_reset_tokens" USING btree ("token_hash");

CREATE INDEX "idx_prt_expires" ON "password_reset_tokens" USING btree ("expires_at");

CREATE INDEX "idx_staff_sessions_user" ON "staff_sessions" USING btree ("staff_user_id");

CREATE INDEX "idx_staff_sessions_expires" ON "staff_sessions" USING btree ("expires_at");

CREATE INDEX "idx_staff_sessions_token" ON "staff_sessions" USING btree ("session_token_hash");

CREATE INDEX "idx_staff_email" ON "staff_users" USING btree ("email");

CREATE INDEX "idx_staff_role" ON "staff_users" USING btree ("role");

CREATE INDEX "idx_staff_active" ON "staff_users" USING btree ("is_active");

CREATE INDEX "idx_rr_room_type" ON "rate_rules" USING btree ("room_type_id");

CREATE INDEX "idx_rr_dates" ON "rate_rules" USING btree ("start_date", "end_date");

CREATE INDEX "idx_rr_active" ON "rate_rules" USING btree ("is_active");

CREATE INDEX "idx_rb_room" ON "room_blocks" USING btree ("room_id");

CREATE INDEX "idx_rb_dates" ON "room_blocks" USING btree ("start_date", "end_date");

CREATE INDEX "idx_rta_room_type" ON "room_type_amenities" USING btree ("room_type_id");

CREATE INDEX "idx_rt_slug" ON "room_types" USING btree ("slug");

CREATE INDEX "idx_rt_active" ON "room_types" USING btree ("is_active");

CREATE INDEX "idx_rooms_type" ON "rooms" USING btree ("room_type_id");

CREATE INDEX "idx_rooms_status" ON "rooms" USING btree ("status");

CREATE INDEX "idx_ik_key" ON "idempotency_keys" USING btree ("key");

CREATE INDEX "idx_ik_expires" ON "idempotency_keys" USING btree ("expires_at");

CREATE INDEX "idx_pwe_provider_event" ON "payment_webhook_events" USING btree ("provider", "event_id");

CREATE INDEX "idx_pwe_processed" ON "payment_webhook_events" USING btree ("processed");

CREATE INDEX "idx_pay_res" ON "payments" USING btree ("reservation_id");

CREATE INDEX "idx_pay_ref" ON "payments" USING btree ("reference");

CREATE INDEX "idx_pay_status" ON "payments" USING btree ("status");

CREATE INDEX "idx_pay_provider" ON "payments" USING btree ("provider");

CREATE INDEX "idx_pay_created" ON "payments" USING btree ("created_at");

CREATE INDEX "idx_rn_res" ON "reservation_nights" USING btree ("reservation_id");

CREATE INDEX "idx_rsh_res" ON "reservation_status_history" USING btree ("reservation_id");

CREATE INDEX "idx_rsh_created" ON "reservation_status_history" USING btree ("created_at");

CREATE INDEX "idx_res_ref" ON "reservations" USING btree ("reference");

CREATE INDEX "idx_res_room" ON "reservations" USING btree ("room_id");

CREATE INDEX "idx_res_room_type" ON "reservations" USING btree ("room_type_id");

CREATE INDEX "idx_res_status" ON "reservations" USING btree ("status");

CREATE INDEX "idx_res_dates" ON "reservations" USING btree ("check_in", "check_out");

CREATE INDEX "idx_res_guest_email" ON "reservations" USING btree ("guest_email");

CREATE INDEX "idx_res_hold" ON "reservations" USING btree ("hold_expires_at");

CREATE INDEX "idx_res_created" ON "reservations" USING btree ("created_at");

CREATE INDEX "idx_enq_status" ON "enquiries" USING btree ("status");

CREATE INDEX "idx_enq_type" ON "enquiries" USING btree ("type");

CREATE INDEX "idx_enq_email" ON "enquiries" USING btree ("email");

CREATE INDEX "idx_enq_created" ON "enquiries" USING btree ("created_at");

CREATE INDEX "idx_enq_spam" ON "enquiries" USING btree ("is_spam");

CREATE INDEX "idx_gi_category" ON "gallery_images" USING btree ("category");

CREATE INDEX "idx_nl_res" ON "notification_logs" USING btree ("reservation_id");

CREATE INDEX "idx_nl_status" ON "notification_logs" USING btree ("status");

CREATE INDEX "idx_nl_channel" ON "notification_logs" USING btree ("channel");

CREATE INDEX "idx_nl_created" ON "notification_logs" USING btree ("created_at");

CREATE INDEX "idx_nl_dedupe" ON "notification_logs" USING btree ("dedupe_key");

CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity", "entity_id");

CREATE INDEX "idx_audit_actor" ON "audit_logs" USING btree ("actor_id");

CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");

CREATE INDEX "idx_audit_action" ON "audit_logs" USING btree ("action");

CREATE INDEX "idx_sr_table_row" ON "seed_records" USING btree ("table_name", "row_id");
