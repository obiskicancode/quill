import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { rateRules, rooms, roomTypes } from '@/db/schema';

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

type QueryExecutor = Pick<typeof db, 'execute'>;

export async function findAvailableRoom(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
  executor: QueryExecutor = db,
  excludeReservationId?: string,
) {
  const exclude = excludeReservationId ?? null;
  // find active room not overlapping reservations/blocks
  const result = await executor.execute(sql`
    SELECT r.* FROM rooms r
    WHERE r.room_type_id = ${roomTypeId}
      AND r.status = 'active'
      AND r.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM reservations x
        WHERE x.room_id = r.id
          AND (${exclude}::uuid IS NULL OR x.id <> ${exclude}::uuid)
          AND (
            x.status IN ('confirmed','checked_in')
            OR (
              x.status = 'pending'
              AND (
                x.hold_expires_at > now()
                OR x.payment_mode = 'pay_at_hotel'
                OR EXISTS (
                  SELECT 1 FROM payments p
                  WHERE p.reservation_id = x.id AND p.status = 'paid'
                )
              )
            )
          )
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
  return (result.rows?.[0] as { id: string } | undefined) ?? null;
}

export async function getRoomById(roomId: string) {
  const [row] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  return row ?? null;
}

export async function listRoomTypes(activeOnly = true) {
  const query = db.select().from(roomTypes);
  if (activeOnly) {
    return query
      .where(eq(roomTypes.isActive, true))
      .orderBy(roomTypes.sortOrder);
  }
  return query.orderBy(roomTypes.sortOrder);
}

export async function getRoomTypeById(id: string) {
  const [row] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, id))
    .limit(1);
  return row ?? null;
}

export async function listRoomRateRules() {
  return db
    .select()
    .from(rateRules)
    .where(eq(rateRules.isActive, true))
    .orderBy(rateRules.priority);
}

export async function countAvailableRoomsByType(
  roomTypeIds: string[],
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string,
): Promise<Map<string, { total: number; available: number }>> {
  if (roomTypeIds.length === 0) return new Map();
  const exclude = excludeReservationId ?? null;
  const result = await db.execute(sql`
    SELECT rt.id AS room_type_id,
           COUNT(r.id)::int AS total,
           COUNT(r.id) FILTER (
             WHERE r.status = 'active' AND r.is_active = true
             AND NOT EXISTS (
               SELECT 1 FROM reservations x
               WHERE x.room_id = r.id
                 AND (${exclude}::uuid IS NULL OR x.id <> ${exclude}::uuid)
                 AND (
                   x.status IN ('confirmed','checked_in')
                   OR (
                     x.status = 'pending'
                     AND (
                       x.hold_expires_at > now()
                       OR x.payment_mode = 'pay_at_hotel'
                       OR EXISTS (
                         SELECT 1 FROM payments p
                         WHERE p.reservation_id = x.id AND p.status = 'paid'
                       )
                     )
                   )
                 )
                 AND daterange(x.check_in, x.check_out, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')
             )
             AND NOT EXISTS (
               SELECT 1 FROM room_blocks b
               WHERE b.room_id = r.id
                 AND daterange(b.start_date, b.end_date, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')
             )
           )::int AS available
    FROM room_types rt
    LEFT JOIN rooms r ON r.room_type_id = rt.id
    WHERE rt.id IN (${sql.join(
      roomTypeIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})
    GROUP BY rt.id
  `);
  const map = new Map<string, { total: number; available: number }>();
  for (const row of result.rows as {
    room_type_id: string;
    total: number;
    available: number;
  }[]) {
    map.set(row.room_type_id, {
      total: Number(row.total),
      available: Number(row.available),
    });
  }
  return map;
}
