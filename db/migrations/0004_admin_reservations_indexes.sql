-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram search indexes for ILIKE substring queries
CREATE INDEX IF NOT EXISTS idx_res_reference_trgm ON reservations USING gin (reference gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_res_guest_name_trgm ON reservations USING gin (guest_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_res_guest_email_trgm ON reservations USING gin (guest_email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_res_guest_phone_trgm ON reservations USING gin (guest_phone gin_trgm_ops);

-- Btree indexes for filtering, presets, and sorting
CREATE INDEX IF NOT EXISTS idx_reservations_guest_phone ON reservations (guest_phone);

CREATE INDEX IF NOT EXISTS idx_reservations_status_check_in ON reservations (status, check_in);

CREATE INDEX IF NOT EXISTS idx_reservations_status_check_out ON reservations (status, check_out);

-- Payment composite indexes for financial lookups and state derivation
CREATE INDEX IF NOT EXISTS idx_payments_status_provider ON payments (status, provider);

CREATE INDEX IF NOT EXISTS idx_payments_res_status ON payments (reservation_id, status);
