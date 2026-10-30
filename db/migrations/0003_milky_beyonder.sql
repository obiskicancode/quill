ALTER TABLE "staff_users"
ADD COLUMN "failed_login_count" smallint DEFAULT 0 NOT NULL;

ALTER TABLE "staff_users"
ADD COLUMN "locked_until" timestamp with time zone;
