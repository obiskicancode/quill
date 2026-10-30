-- 0011_enquiries_management.sql
-- Schema additions for Enquiries inbox, assignment, notes, and full-text search
-- Ensure is_spam column exists with default false
ALTER TABLE "enquiries"
ADD COLUMN IF NOT EXISTS "is_spam" boolean NOT NULL DEFAULT false;

-- Add assigned_to for staff allocation
ALTER TABLE "enquiries"
ADD COLUMN IF NOT EXISTS "assigned_to" uuid REFERENCES "staff_users" ("id") ON DELETE SET NULL;

-- Ensure reservation_id FK is present for conversion linking
ALTER TABLE "enquiries"
ADD COLUMN IF NOT EXISTS "reservation_id" uuid REFERENCES "reservations" ("id") ON DELETE SET NULL;

-- Update enquiry_notes to support body and created_by column conventions
ALTER TABLE "enquiry_notes"
ADD COLUMN IF NOT EXISTS "body" text;

ALTER TABLE "enquiry_notes"
ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "staff_users" ("id") ON DELETE CASCADE;

-- Backfill notes columns if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiry_notes' AND column_name = 'note') THEN
    UPDATE "enquiry_notes" SET "body" = "note" WHERE "body" IS NULL AND "note" IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiry_notes' AND column_name = 'staff_user_id') THEN
    UPDATE "enquiry_notes" SET "created_by" = "staff_user_id" WHERE "created_by" IS NULL AND "staff_user_id" IS NOT NULL;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_enq_status_spam_created" ON "enquiries" ("status", "is_spam", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_enq_assigned_to" ON "enquiries" ("assigned_to");

CREATE INDEX IF NOT EXISTS "idx_enq_email_created" ON "enquiries" ("email", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_enq_phone_created" ON "enquiries" ("phone", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_enquiry_notes_enquiry_id" ON "enquiry_notes" ("enquiry_id", "created_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_enquiry_replies_enquiry_id" ON "enquiry_replies" ("enquiry_id", "created_at" ASC);

-- Full-text / Trigram search indexes (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_enq_search_trgm" ON "enquiries" USING gin (
  (
    "name" || ' ' || "email" || ' ' || COALESCE("phone", '') || ' ' || COALESCE("subject", '') || ' ' || "message"
  ) gin_trgm_ops
);
