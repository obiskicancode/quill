-- Extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Singleton hotel settings
ALTER TABLE hotel_settings
ADD CONSTRAINT hotel_settings_singleton CHECK (id = 1);

-- Check constraints
ALTER TABLE reservations
ADD CONSTRAINT chk_res_dates CHECK (check_out > check_in),
ADD CONSTRAINT chk_res_guests CHECK (
  adults >= 1
  AND children >= 0
),
ADD CONSTRAINT chk_res_money CHECK (
  total_minor >= 0
  AND amount_paid_minor >= 0
  AND amount_refunded_minor >= 0
  AND deposit_required_minor >= 0
),
ADD CONSTRAINT chk_res_email CHECK (
  guest_email IS NOT NULL
  OR guest_email_missing = true
);

ALTER TABLE room_blocks
ADD CONSTRAINT chk_block_dates CHECK (end_date > start_date);

ALTER TABLE rate_rules
ADD CONSTRAINT chk_rule_dates CHECK (end_date >= start_date);

ALTER TABLE room_types
ADD CONSTRAINT chk_rt_price CHECK (
  base_price_minor >= 0
  AND max_adults >= 1
);

ALTER TABLE testimonials
ADD CONSTRAINT chk_rating CHECK (
  rating IS NULL
  OR rating BETWEEN 1 AND 5
);

ALTER TABLE payments
ADD CONSTRAINT chk_pay_amount CHECK (amount_minor > 0);

ALTER TABLE hotel_settings
ADD CONSTRAINT chk_bps CHECK (
  tax_bps BETWEEN 0 AND 10000
  AND service_charge_bps BETWEEN 0 AND 10000
  AND deposit_bps BETWEEN 0 AND 10000
  AND refund_bps_after_window BETWEEN 0 AND 10000
);

-- Exclusion constraints for no double-booking
ALTER TABLE reservations
ADD CONSTRAINT no_overlapping_reservations EXCLUDE USING gist (
  room_id
  WITH
    =,
    daterange (check_in, check_out, '[)')
  WITH
    &&
)
WHERE
  (status IN ('pending', 'confirmed', 'checked_in'));

ALTER TABLE room_blocks
ADD CONSTRAINT no_overlapping_blocks EXCLUDE USING gist (
  room_id
  WITH
    =,
    daterange (start_date, end_date, '[)')
  WITH
    &&
);

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

CREATE TRIGGER trg_reservation_vs_blocks
BEFORE INSERT OR UPDATE OF room_id,
check_in,
check_out,
status ON reservations FOR EACH ROW
EXECUTE FUNCTION prevent_block_reservation_conflict ();

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

-- Apply updated_at triggers to tables that have updated_at
CREATE TRIGGER trg_hotel_settings_updated_at
BEFORE UPDATE ON hotel_settings FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_bank_accounts_updated_at
BEFORE UPDATE ON bank_accounts FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_social_links_updated_at
BEFORE UPDATE ON social_links FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_staff_users_updated_at
BEFORE UPDATE ON staff_users FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_room_types_updated_at
BEFORE UPDATE ON room_types FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_rooms_updated_at
BEFORE UPDATE ON rooms FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_room_blocks_updated_at
BEFORE UPDATE ON room_blocks FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_rate_rules_updated_at
BEFORE UPDATE ON rate_rules FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_extras_updated_at
BEFORE UPDATE ON extras FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_reservations_updated_at
BEFORE UPDATE ON reservations FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_enquiries_updated_at
BEFORE UPDATE ON enquiries FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_site_pages_updated_at
BEFORE UPDATE ON site_pages FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_facilities_updated_at
BEFORE UPDATE ON facilities FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_gallery_images_updated_at
BEFORE UPDATE ON gallery_images FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_testimonials_updated_at
BEFORE UPDATE ON testimonials FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_faqs_updated_at
BEFORE UPDATE ON faqs FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_team_members_updated_at
BEFORE UPDATE ON team_members FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_nearby_attractions_updated_at
BEFORE UPDATE ON nearby_attractions FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_notification_templates_updated_at
BEFORE UPDATE ON notification_templates FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

CREATE TRIGGER trg_notification_recipients_updated_at
BEFORE UPDATE ON notification_recipients FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- Audit logs append-only
CREATE OR REPLACE FUNCTION audit_logs_append_only () RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update_delete
BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW
EXECUTE FUNCTION audit_logs_append_only ();

CREATE TRIGGER trg_audit_no_truncate
BEFORE TRUNCATE ON audit_logs FOR EACH STATEMENT
EXECUTE FUNCTION audit_logs_append_only ();

-- Trigram search indexes
CREATE INDEX idx_res_guest_name_trgm ON reservations USING gin (guest_name gin_trgm_ops);

CREATE INDEX idx_res_guest_email_trgm ON reservations USING gin (guest_email gin_trgm_ops);

CREATE INDEX idx_enq_name_trgm ON enquiries USING gin (name gin_trgm_ops);

CREATE INDEX idx_enq_email_trgm ON enquiries USING gin (email gin_trgm_ops);

CREATE INDEX idx_enq_message_trgm ON enquiries USING gin (message gin_trgm_ops);

CREATE INDEX idx_res_email_lower ON reservations (lower(guest_email));
