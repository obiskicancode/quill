-- Ensures notification_templates.updated_by references staff_users(id) and necessary indexes exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_templates' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE "notification_templates" ADD COLUMN "updated_by" uuid REFERENCES "staff_users"("id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_nt_updated_by" ON "notification_templates" ("updated_by");

CREATE INDEX IF NOT EXISTS "idx_nt_key_channel" ON "notification_templates" ("key", "channel");
