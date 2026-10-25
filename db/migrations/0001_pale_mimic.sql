CREATE TABLE "quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(20) NOT NULL,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "breakdown" jsonb NOT NULL,
  "old_total_minor" integer NOT NULL,
  "new_total_minor" integer NOT NULL,
  "settle" varchar(10) NOT NULL,
  "room_reassigned" boolean DEFAULT false NOT NULL,
  "policy" jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE INDEX "idx_quotes_ref" ON "quotes" USING btree ("reference");

--> statement-breakpoint
CREATE INDEX "idx_quotes_expires" ON "quotes" USING btree ("expires_at");
