-- GiST range indexes for lightning-fast calendar queries
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE INDEX IF NOT EXISTS idx_reservations_calendar_gist ON reservations USING gist (daterange (check_in, check_out, '[)'))
WHERE
  status IN ('pending', 'confirmed', 'checked_in');

CREATE INDEX IF NOT EXISTS idx_room_blocks_calendar_gist ON room_blocks USING gist (daterange (start_date, end_date, '[)'));
