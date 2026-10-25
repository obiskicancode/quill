import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { rooms, roomTypes } from '@/db/schema';

export async function findRoomTypeBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function findActiveRoomTypeBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(roomTypes)
    .where(and(eq(roomTypes.slug, slug), eq(roomTypes.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function findAvailableRoom(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
) {
  // find active room not overlapping reservations/blocks
  const result = await db.execute(sql`
    SELECT r.* FROM rooms r
    WHERE r.room_type_id = ${roomTypeId}
      AND r.status = 'active'
      AND r.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM reservations x
        WHERE x.room_id = r.id
          AND x.status IN ('pending','confirmed','checked_in')
          AND daterange(x.check_in, x.check_out, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')
      )
      AND NOT EXISTS (
        SELECT 1 FROM room_blocks b
        WHERE b.room_id = r.id
          AND daterange(b.start_date, b.end_date, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')
      )
    ORDER BY r.room_number
    LIMIT 1
    FOR UPDATE OF r SKIP LOCKED
  `);
  return result.rows?.[0] ?? null;
}

export async function getRoomById(roomId: string) {
  const [row] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  return row ?? null;
}
