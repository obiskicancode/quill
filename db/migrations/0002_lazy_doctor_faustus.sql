CREATE TABLE "payment_proofs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL,
  "storage_key" text NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "size_bytes" integer NOT NULL,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "refunds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_id" uuid NOT NULL,
  "payment_id" uuid,
  "amount_minor" integer NOT NULL,
  "method" varchar(30) DEFAULT 'none' NOT NULL,
  "status" varchar(30) DEFAULT 'none' NOT NULL,
  "timeline" varchar(100),
  "reason" text,
  "provider_ref" varchar(150),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone
);

CREATE TABLE "reservation_changes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_id" uuid NOT NULL,
  "quote_id" uuid,
  "new_room_id" uuid,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "breakdown" jsonb NOT NULL,
  "total_minor" integer NOT NULL,
  "amount_due_minor" integer NOT NULL,
  "status" varchar(30) DEFAULT 'awaiting_payment' NOT NULL,
  "method" varchar(20),
  "room_reassigned" boolean DEFAULT false NOT NULL,
  "policy" jsonb NOT NULL,
  "hold_expires_at" timestamp with time zone NOT NULL,
  "payment_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "facilities"
ADD COLUMN "kind" varchar(30) DEFAULT 'other' NOT NULL;

ALTER TABLE "facilities"
ADD COLUMN "opening_hours" varchar(255);

ALTER TABLE "facilities"
ADD COLUMN "pricing" varchar(20);

ALTER TABLE "facilities"
ADD COLUMN "price_note" text;

ALTER TABLE "facilities"
ADD COLUMN "capacity" varchar(100);

ALTER TABLE "facilities"
ADD COLUMN "layouts" text[] DEFAULT '{}'::text[] NOT NULL;

ALTER TABLE "facilities"
ADD COLUMN "cta_label" varchar(100);

ALTER TABLE "facilities"
ADD COLUMN "cta_topic" varchar(50);

ALTER TABLE "gallery_images"
ADD COLUMN "thumbnail_url" text;

ALTER TABLE "gallery_images"
ADD COLUMN "room_type_id" uuid;

ALTER TABLE "gallery_images"
ADD COLUMN "facility_id" uuid;

ALTER TABLE "gallery_images"
ADD COLUMN "width" integer;

ALTER TABLE "gallery_images"
ADD COLUMN "height" integer;

ALTER TABLE "gallery_images"
ADD COLUMN "color" varchar(9);

ALTER TABLE "gallery_images"
ADD COLUMN "blur_data_url" text;

ALTER TABLE "site_pages"
ADD COLUMN "intro" text;

ALTER TABLE "site_pages"
ADD COLUMN "hero_image_url" text;

ALTER TABLE "site_pages"
ADD COLUMN "hero_image_alt" varchar(255);

ALTER TABLE "site_pages"
ADD COLUMN "content" jsonb;

ALTER TABLE "testimonials"
ADD COLUMN "room_type_id" uuid;

ALTER TABLE "extras"
ADD COLUMN "max_quantity" integer DEFAULT 10 NOT NULL;

ALTER TABLE "room_types"
ADD COLUMN "min_stay_nights" smallint DEFAULT 1 NOT NULL;

ALTER TABLE "room_types"
ADD COLUMN "extra_bed_available" boolean DEFAULT false NOT NULL;

ALTER TABLE "room_types"
ADD COLUMN "show_price" boolean DEFAULT true NOT NULL;

ALTER TABLE "room_types"
ADD COLUMN "breakfast_included" boolean DEFAULT false NOT NULL;

ALTER TABLE "room_types"
ADD COLUMN "taxes_included" boolean DEFAULT false NOT NULL;

ALTER TABLE "room_types"
ADD COLUMN "view_notes" text;

ALTER TABLE "hotel_settings"
ADD COLUMN "min_nights" smallint DEFAULT 1 NOT NULL;

ALTER TABLE "hotel_settings"
ADD COLUMN "max_nights" smallint DEFAULT 30 NOT NULL;

ALTER TABLE "hotel_settings"
ADD COLUMN "same_day_cutoff" varchar(5) DEFAULT '18:00' NOT NULL;

ALTER TABLE "hotel_settings"
ADD COLUMN "site_config" jsonb;

ALTER TABLE "hotel_settings"
ADD COLUMN "manage_settings" jsonb;

ALTER TABLE "hotel_settings"
ADD COLUMN "policy_settings" jsonb;

ALTER TABLE "payment_proofs"
ADD CONSTRAINT "payment_proofs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "reservation_changes"
ADD CONSTRAINT "reservation_changes_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations" ("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "reservation_changes"
ADD CONSTRAINT "reservation_changes_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes" ("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "reservation_changes"
ADD CONSTRAINT "reservation_changes_new_room_id_rooms_id_fk" FOREIGN KEY ("new_room_id") REFERENCES "public"."rooms" ("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "reservation_changes"
ADD CONSTRAINT "reservation_changes_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments" ("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "idx_pp_payment" ON "payment_proofs" USING btree ("payment_id");

CREATE INDEX "idx_refunds_res" ON "refunds" USING btree ("reservation_id");

CREATE INDEX "idx_refunds_status" ON "refunds" USING btree ("status");

CREATE INDEX "idx_rc_res" ON "reservation_changes" USING btree ("reservation_id");

CREATE INDEX "idx_rc_status" ON "reservation_changes" USING btree ("status");

CREATE INDEX "idx_rc_hold" ON "reservation_changes" USING btree ("hold_expires_at");

ALTER TABLE "gallery_images"
ADD CONSTRAINT "gallery_images_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types" ("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "testimonials"
ADD CONSTRAINT "testimonials_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types" ("id") ON DELETE set null ON UPDATE no action;
