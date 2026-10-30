-- Extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Singleton hotel settings
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'hotel_settings_singleton'
) THEN
  ALTER TABLE hotel_settings
  ADD CONSTRAINT hotel_settings_singleton CHECK (id = 1);
END IF; END $$;

-- Check constraints
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_res_dates'
) THEN
  ALTER TABLE reservations ADD CONSTRAINT chk_res_dates CHECK (check_out > check_in);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_res_guests'
) THEN
  ALTER TABLE reservations ADD CONSTRAINT chk_res_guests CHECK (
    adults >= 1 AND children >= 0
  );
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_res_money'
) THEN
  ALTER TABLE reservations ADD CONSTRAINT chk_res_money CHECK (
    total_minor >= 0
    AND amount_paid_minor >= 0
    AND amount_refunded_minor >= 0
    AND deposit_required_minor >= 0
  );
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_res_email'
) THEN
  ALTER TABLE reservations ADD CONSTRAINT chk_res_email CHECK (
    guest_email IS NOT NULL OR guest_email_missing = true
  );
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_block_dates'
) THEN
  ALTER TABLE room_blocks ADD CONSTRAINT chk_block_dates CHECK (end_date > start_date);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_rule_dates'
) THEN
  ALTER TABLE rate_rules ADD CONSTRAINT chk_rule_dates CHECK (end_date >= start_date);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_rt_price'
) THEN
  ALTER TABLE room_types ADD CONSTRAINT chk_rt_price CHECK (
    base_price_minor >= 0 AND max_adults >= 1
  );
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_rating'
) THEN
  ALTER TABLE testimonials ADD CONSTRAINT chk_rating CHECK (
    rating IS NULL OR rating BETWEEN 1 AND 5
  );
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_pay_amount'
) THEN
  ALTER TABLE payments ADD CONSTRAINT chk_pay_amount CHECK (amount_minor > 0);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'chk_bps'
) THEN
  ALTER TABLE hotel_settings ADD CONSTRAINT chk_bps CHECK (
    tax_bps BETWEEN 0 AND 10000
    AND service_charge_bps BETWEEN 0 AND 10000
    AND deposit_bps BETWEEN 0 AND 10000
    AND refund_bps_after_window BETWEEN 0 AND 10000
  );
END IF; END $$;

-- Exclusion constraints for no double-booking
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_reservations'
) THEN
  ALTER TABLE reservations
  ADD CONSTRAINT no_overlapping_reservations EXCLUDE USING gist (
    room_id WITH =,
    daterange (check_in, check_out, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'checked_in'));
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_blocks'
) THEN
  ALTER TABLE room_blocks
  ADD CONSTRAINT no_overlapping_blocks EXCLUDE USING gist (
    room_id WITH =,
    daterange (start_date, end_date, '[)') WITH &&
  );
END IF; END $$;

-- Prevent block/reservation conflicts
CREATE OR REPLACE FUNCTION prevent_block_reservation_conflict () RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'reservations' THEN
    IF NEW.status IN ('pending', 'confirmed', 'checked_in') AND EXISTS (
      SELECT 1 FROM room_blocks b
       WHERE b.room_id = NEW.room_id
         AND daterange(b.start_date, b.end_date, '[)') && daterange(NEW.check_in, NEW.check_out, '[)')
    ) THEN
      RAISE EXCEPTION 'Room is blocked for the selected dates' USING ERRCODE = '23P01';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM reservations r
       WHERE r.room_id = NEW.room_id
         AND r.status IN ('pending', 'confirmed', 'checked_in')
         AND daterange(r.check_in, r.check_out, '[)') && daterange(NEW.start_date, NEW.end_date, '[)')
    ) THEN
      RAISE EXCEPTION 'Block overlaps an existing reservation' USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reservation_vs_blocks ON reservations;

CREATE TRIGGER trg_reservation_vs_blocks
BEFORE INSERT OR UPDATE OF room_id,
check_in,
check_out,
status ON reservations FOR EACH ROW
EXECUTE FUNCTION prevent_block_reservation_conflict ();

DROP TRIGGER IF EXISTS trg_block_vs_reservations ON room_blocks;

CREATE TRIGGER trg_block_vs_reservations
BEFORE INSERT OR UPDATE OF room_id,
start_date,
end_date ON room_blocks FOR EACH ROW
EXECUTE FUNCTION prevent_block_reservation_conflict ();

-- updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at () RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'hotel_settings',
    'bank_accounts',
    'social_links',
    'staff_users',
    'room_types',
    'rooms',
    'room_blocks',
    'rate_rules',
    'extras',
    'reservations',
    'payments',
    'enquiries',
    'site_pages',
    'facilities',
    'gallery_images',
    'testimonials',
    'faqs',
    'team_members',
    'nearby_attractions',
    'notification_templates',
    'notification_recipients'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I',
      'trg_' || table_name || '_updated_at',
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      'trg_' || table_name || '_updated_at',
      table_name
    );
  END LOOP;
END $$;

-- Audit logs append-only
CREATE OR REPLACE FUNCTION audit_logs_append_only () RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update_delete ON audit_logs;

CREATE TRIGGER trg_audit_no_update_delete
BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW
EXECUTE FUNCTION audit_logs_append_only ();

DROP TRIGGER IF EXISTS trg_audit_no_truncate ON audit_logs;

CREATE TRIGGER trg_audit_no_truncate
BEFORE TRUNCATE ON audit_logs FOR EACH STATEMENT
EXECUTE FUNCTION audit_logs_append_only ();

-- Trigram search indexes
CREATE INDEX IF NOT EXISTS idx_res_guest_name_trgm ON reservations USING gin (guest_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_res_guest_email_trgm ON reservations USING gin (guest_email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_enq_name_trgm ON enquiries USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_enq_email_trgm ON enquiries USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_enq_message_trgm ON enquiries USING gin (message gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_res_email_lower ON reservations (lower(guest_email));
