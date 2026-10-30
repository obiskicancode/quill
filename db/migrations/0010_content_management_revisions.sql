-- Migration: Add title, body, and index to site_page_revisions
ALTER TABLE "site_page_revisions"
ADD COLUMN IF NOT EXISTS "title" varchar(200);

ALTER TABLE "site_page_revisions"
ADD COLUMN IF NOT EXISTS "body" text;

CREATE INDEX IF NOT EXISTS "idx_site_page_revisions_page_created" ON "site_page_revisions" ("page_id", "created_at" DESC);
