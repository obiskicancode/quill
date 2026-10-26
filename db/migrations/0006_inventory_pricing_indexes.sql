-- Indexes for inventory and pricing management
CREATE INDEX IF NOT EXISTS idx_rooms_room_type_status ON rooms (room_type_id, status);

CREATE INDEX IF NOT EXISTS idx_rate_rules_active_dates ON rate_rules (room_type_id, is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_gallery_images_room_type ON gallery_images (room_type_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_extras_active_sort ON extras (is_active, sort_order);
