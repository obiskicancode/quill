-- Seed registry hardening: one record per seeded table row, and a fast lookup
-- by seed name so demo/e2e rows can be reset independently.
DROP INDEX IF EXISTS "idx_sr_table_row";

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sr_table_row" ON "seed_records" USING btree ("table_name", "row_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sr_seed_name" ON "seed_records" USING btree ("seed_name");
