-- Lifecycle hardening: stale holds, pay-at-hotel cleanup, and refund worker claims.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS refund_claimed_at timestamptz,
ADD COLUMN IF NOT EXISTS refund_attempts integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_last_error text;

CREATE INDEX IF NOT EXISTS idx_payments_refund_queue ON payments (status, refund_claimed_at)
WHERE
  type = 'refund'
  AND status = 'pending';

UPDATE reservations
SET
  status = 'confirmed',
  confirmed_at = COALESCE(confirmed_at, now()),
  updated_at = now()
WHERE
  status = 'pending'
  AND payment_mode = 'pay_at_hotel'
  AND confirmation_mode = 'instant';

-- Expire stale unpaid holds. Paid rows are left for reconciliation.
UPDATE reservations r
SET
  status = 'expired',
  updated_at = now()
WHERE
  r.status = 'pending'
  AND r.payment_mode <> 'pay_at_hotel'
  AND r.hold_expires_at IS NOT NULL
  AND r.hold_expires_at < now()
  AND NOT EXISTS (
    SELECT
      1
    FROM
      payments p
    WHERE
      p.reservation_id = r.id
      AND p.type <> 'refund'
      AND p.status = 'paid'
  );

UPDATE reservation_changes
SET
  status = 'expired',
  updated_at = now()
WHERE
  status IN ('awaiting_payment', 'awaiting_transfer')
  AND hold_expires_at < now();

-- Revalidate critical constraints/triggers even if the original extras migration
-- was recorded before the production fix.
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
