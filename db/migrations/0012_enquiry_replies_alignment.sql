-- 0012_enquiry_replies_alignment.sql
-- Schema additions for enquiry_replies sent_by and channel columns to align with content schema and dbml
ALTER TABLE "enquiry_replies"
ADD COLUMN IF NOT EXISTS "channel" varchar(20) DEFAULT 'email';

ALTER TABLE "enquiry_replies"
ADD COLUMN IF NOT EXISTS "sent_by" uuid REFERENCES "staff_users" ("id") ON DELETE SET NULL;

-- Backfill replies columns from legacy columns if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiry_replies' AND column_name = 'sent_via') THEN
    UPDATE "enquiry_replies" SET "channel" = "sent_via" WHERE "channel" IS NULL AND "sent_via" IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enquiry_replies' AND column_name = 'staff_user_id') THEN
    UPDATE "enquiry_replies" SET "sent_by" = "staff_user_id" WHERE "sent_by" IS NULL AND "staff_user_id" IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_enquiry_replies_sent_by" ON "enquiry_replies" ("sent_by");
