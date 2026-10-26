-- Migration 0007: Admin Payments, Staff Accounts and Audit Log Additions
-- 1. Token purpose enum and password_reset_tokens column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'token_purpose') THEN
    CREATE TYPE token_purpose AS ENUM ('reset', 'invite');
  END IF;
END $$;

ALTER TABLE password_reset_tokens
ADD COLUMN IF NOT EXISTS purpose token_purpose NOT NULL DEFAULT 'reset';

-- 2. Staff user additions
ALTER TABLE staff_users
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES staff_users (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;

-- 3. Payments reconciliation additions & indexes
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
ADD COLUMN IF NOT EXISTS reconciled_by uuid REFERENCES staff_users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_reconciled_at ON payments (reconciled_at);

CREATE INDEX IF NOT EXISTS idx_payments_status_paid_at ON payments (status, paid_at);

CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON payments (provider, provider_ref);

-- 4. Trigram extension for fast searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_payments_reference_trgm ON payments USING gin (reference gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_audit_logs_summary_trgm ON audit_logs USING gin (reason gin_trgm_ops);

-- 5. Append-only enforcement for audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification () RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs entries are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;

CREATE TRIGGER trg_audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification ();

-- Revoke mutation privileges from application/public role
REVOKE
UPDATE,
DELETE ON audit_logs
FROM
  PUBLIC;
