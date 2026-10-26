import { and, asc, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  hotelSettings,
  reservations,
  roomBlocks,
  rooms,
  roomTypes,
  staffUsers,
} from '@/db/schema';
import { addDays, hotelClock, nightsBetween } from '@/lib/dates';
import { createAuditLog } from '@/lib/db/repositories/audit.repo';
import type {
  BlockCheckConflict,
  BlockCheckResponse,
  CalendarBlockBar,
  CalendarDayResponse,
  CalendarNightStat,
  CalendarReservationBar,
  CalendarResponse,
  CalendarRoom,
  RoomBlockListItem,
  RoomBlocksListResponse,
} from '@/types/calendar.types';

export async function getCalendarData(options: {
  from: string;
  days: number;
  roomTypeId?: string;
}): Promise<CalendarResponse> {
  const { from, days, roomTypeId } = options;
  const to = addDays(from, days);

  // 1. Hotel Settings
  const [settings] = await db
    .select({ timezone: hotelSettings.timezone })
    .from(hotelSettings)
    .limit(1);
  const timezone = settings?.timezone || 'Africa/Lagos';
  const { today } = hotelClock(new Date(), timezone);

  // 2. Query Rooms
  const roomQuery = db
    .select({
      id: rooms.id,
      roomNumber: rooms.roomNumber,
      floor: rooms.floor,
      status: rooms.status,
      roomTypeId: rooms.roomTypeId,
      roomTypeName: roomTypes.name,
      roomTypeSlug: roomTypes.slug,
      sortOrder: roomTypes.sortOrder,
    })
    .from(rooms)
    .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
    .where(roomTypeId ? eq(rooms.roomTypeId, roomTypeId) : sql`1=1`)
    .orderBy(asc(roomTypes.sortOrder), asc(rooms.roomNumber));

  const rawRooms = await roomQuery;
  const calendarRooms: CalendarRoom[] = rawRooms.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    floor: r.floor,
    status: r.status as 'active' | 'maintenance' | 'inactive',
    roomTypeId: r.roomTypeId,
    roomTypeName: r.roomTypeName,
    roomTypeSlug: r.roomTypeSlug,
    sortOrder: r.sortOrder,
  }));

  // Group Room Types
  const typeMap = new Map<
    string,
    { id: string; name: string; slug: string; totalRooms: number }
  >();
  for (const r of calendarRooms) {
    const existing = typeMap.get(r.roomTypeId);
    if (existing) {
      existing.totalRooms += 1;
    } else {
      typeMap.set(r.roomTypeId, {
        id: r.roomTypeId,
        name: r.roomTypeName,
        slug: r.roomTypeSlug,
        totalRooms: 1,
      });
    }
  }

  // 3. Overlapping Reservations in [from, to)
  const roomIds = calendarRooms.map((r) => r.id);
  let rawReservations: Array<{
    id: string;
    reference: string;
    roomId: string | null;
    checkIn: string;
    checkOut: string;
    status: string;
    guestName: string;
    totalMinor: number;
    amountPaidMinor: number;
    amountRefundedMinor: number;
    holdExpiresAt: Date | null;
  }> = [];

  if (roomIds.length > 0) {
    rawReservations = await db
      .select({
        id: reservations.id,
        reference: reservations.reference,
        roomId: reservations.roomId,
        checkIn: reservations.checkIn,
        checkOut: reservations.checkOut,
        status: reservations.status,
        guestName: reservations.guestName,
        totalMinor: reservations.totalMinor,
        amountPaidMinor: reservations.amountPaidMinor,
        amountRefundedMinor: reservations.amountRefundedMinor,
        holdExpiresAt: reservations.holdExpiresAt,
      })
      .from(reservations)
      .where(
        and(
          inArray(reservations.roomId, roomIds),
          sql`daterange(${reservations.checkIn}, ${reservations.checkOut}, '[)') && daterange(${from}::date, ${to}::date, '[)')`,
          inArray(reservations.status, [
            'pending',
            'confirmed',
            'checked_in',
            'checked_out',
          ]),
        ),
      );
  }

  const nowTime = new Date().getTime();
  const calendarReservations: CalendarReservationBar[] = rawReservations.map(
    (res) => {
      const isStale =
        res.status === 'pending' &&
        res.holdExpiresAt !== null &&
        new Date(res.holdExpiresAt).getTime() < nowTime;

      const netPaid = res.amountPaidMinor - res.amountRefundedMinor;
      let paymentState: 'unpaid' | 'deposit_paid' | 'fully_paid' | 'refunded' =
        'unpaid';
      if (res.amountRefundedMinor > 0 && netPaid <= 0) {
        paymentState = 'refunded';
      } else if (netPaid >= res.totalMinor && res.totalMinor > 0) {
        paymentState = 'fully_paid';
      } else if (netPaid > 0) {
        paymentState = 'deposit_paid';
      }

      return {
        id: res.id,
        reference: res.reference,
        roomId: res.roomId!,
        checkIn: res.checkIn,
        checkOut: res.checkOut,
        status: res.status as CalendarReservationBar['status'],
        guestName: res.guestName,
        paymentState,
        holdExpiresAt: res.holdExpiresAt?.toISOString() ?? null,
        isStaleHold: isStale,
      };
    },
  );

  // 4. Overlapping Blocks in [from, to)
  let rawBlocks: Array<{
    id: string;
    roomId: string;
    startDate: string;
    endDate: string;
    reason: string;
    notes: string | null;
    createdByName: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  if (roomIds.length > 0) {
    rawBlocks = await db
      .select({
        id: roomBlocks.id,
        roomId: roomBlocks.roomId,
        startDate: roomBlocks.startDate,
        endDate: roomBlocks.endDate,
        reason: roomBlocks.reason,
        notes: roomBlocks.notes,
        createdByName: sql<string>`concat(${staffUsers.firstName}, ' ', ${staffUsers.lastName})`,
        createdAt: roomBlocks.createdAt,
        updatedAt: roomBlocks.updatedAt,
      })
      .from(roomBlocks)
      .leftJoin(staffUsers, eq(roomBlocks.createdBy, staffUsers.id))
      .where(
        and(
          inArray(roomBlocks.roomId, roomIds),
          sql`daterange(${roomBlocks.startDate}, ${roomBlocks.endDate}, '[)') && daterange(${from}::date, ${to}::date, '[)')`,
        ),
      );
  }

  const calendarBlocks: CalendarBlockBar[] = rawBlocks.map((b) => ({
    id: b.id,
    roomId: b.roomId,
    startDate: b.startDate,
    endDate: b.endDate,
    reason: b.reason as CalendarBlockBar['reason'],
    notes: b.notes,
    createdByName: b.createdByName?.trim() || null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  // 5. Per-Night Statistics & Free Units
  const stats: CalendarNightStat[] = [];
  const totalRoomsCount = calendarRooms.length;

  for (let i = 0; i < days; i++) {
    const nightDate = addDays(from, i);

    // Active non-stale reservations occupying this night
    const occupiedInNight = calendarReservations.filter(
      (r) => !r.isStaleHold && r.checkIn <= nightDate && r.checkOut > nightDate,
    );

    // Blocks occupying this night
    const blockedInNight = calendarBlocks.filter(
      (b) => b.startDate <= nightDate && b.endDate > nightDate,
    );

    // Inactive/Maintenance rooms
    const outOfServiceInNight = calendarRooms.filter(
      (r) => r.status === 'maintenance' || r.status === 'inactive',
    );

    const occupiedRoomIdSet = new Set(occupiedInNight.map((r) => r.roomId));
    const blockedRoomIdSet = new Set(blockedInNight.map((b) => b.roomId));
    const outOfServiceIdSet = new Set(outOfServiceInNight.map((r) => r.id));

    // Sellable denominator: total minus out-of-service and blocked
    const unavailableDenominatorSet = new Set([
      ...outOfServiceIdSet,
      ...blockedRoomIdSet,
    ]);
    const sellableRooms = Math.max(
      0,
      totalRoomsCount - unavailableDenominatorSet.size,
    );

    const occupiedCount = occupiedInNight.length;
    const occupancyPercent =
      sellableRooms > 0
        ? Math.min(100, Math.round((occupiedCount / sellableRooms) * 100))
        : 0;

    const arrivalsCount = calendarReservations.filter(
      (r) => !r.isStaleHold && r.checkIn === nightDate,
    ).length;

    const departuresCount = calendarReservations.filter(
      (r) => !r.isStaleHold && r.checkOut === nightDate,
    ).length;

    // Free by room type
    const freeByType: Record<string, { total: number; free: number }> = {};
    for (const type of typeMap.values()) {
      const typeRooms = calendarRooms.filter((r) => r.roomTypeId === type.id);
      const freeCount = typeRooms.filter(
        (r) =>
          !occupiedRoomIdSet.has(r.id) &&
          !blockedRoomIdSet.has(r.id) &&
          !outOfServiceIdSet.has(r.id),
      ).length;
      freeByType[type.id] = {
        total: typeRooms.length,
        free: freeCount,
      };
    }

    stats.push({
      date: nightDate,
      totalRooms: totalRoomsCount,
      sellableRooms,
      occupiedRooms: occupiedCount,
      occupancyPercent,
      arrivalsCount,
      departuresCount,
      freeByType,
    });
  }

  return {
    from,
    days,
    to,
    today,
    timezone,
    rooms: calendarRooms,
    roomTypes: Array.from(typeMap.values()),
    reservations: calendarReservations,
    blocks: calendarBlocks,
    stats,
  };
}

export async function getCalendarDayData(
  date: string,
): Promise<CalendarDayResponse> {
  // 1. Query Arrivals (checkIn === date)
  const arrivalsRows = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      roomId: reservations.roomId,
      roomNumber: rooms.roomNumber,
      guestName: reservations.guestName,
      guestPhone: reservations.guestPhone,
      status: reservations.status,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(
      and(
        eq(reservations.checkIn, date),
        inArray(reservations.status, ['pending', 'confirmed', 'checked_in']),
      ),
    );

  // 2. Query Departures (checkOut === date)
  const departuresRows = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      roomId: reservations.roomId,
      roomNumber: rooms.roomNumber,
      guestName: reservations.guestName,
      guestPhone: reservations.guestPhone,
      status: reservations.status,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(
      and(
        eq(reservations.checkOut, date),
        inArray(reservations.status, [
          'confirmed',
          'checked_in',
          'checked_out',
        ]),
      ),
    );

  // 3. Query In-House (stay covers date: checkIn < date AND checkOut > date)
  const inHouseRows = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      roomId: reservations.roomId,
      roomNumber: rooms.roomNumber,
      guestName: reservations.guestName,
      guestPhone: reservations.guestPhone,
      status: reservations.status,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(
      and(
        lt(reservations.checkIn, date),
        gt(reservations.checkOut, date),
        inArray(reservations.status, ['confirmed', 'checked_in']),
      ),
    );

  // 4. Query Blocks on this date
  const blocksRows = await db
    .select({
      id: roomBlocks.id,
      roomId: roomBlocks.roomId,
      roomNumber: rooms.roomNumber,
      roomTypeName: roomTypes.name,
      reason: roomBlocks.reason,
      notes: roomBlocks.notes,
      startDate: roomBlocks.startDate,
      endDate: roomBlocks.endDate,
    })
    .from(roomBlocks)
    .innerJoin(rooms, eq(roomBlocks.roomId, rooms.id))
    .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
    .where(and(lte(roomBlocks.startDate, date), gt(roomBlocks.endDate, date)));

  // 5. Compute Free Rooms By Type for this date
  const allRooms = await db
    .select({
      id: rooms.id,
      roomNumber: rooms.roomNumber,
      status: rooms.status,
      roomTypeId: rooms.roomTypeId,
      roomTypeName: roomTypes.name,
    })
    .from(rooms)
    .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
    .orderBy(asc(roomTypes.sortOrder), asc(rooms.roomNumber));

  // Occupied set on this date (checkIn <= date AND checkOut > date)
  const occupiedRows = await db
    .select({ roomId: reservations.roomId })
    .from(reservations)
    .where(
      and(
        lte(reservations.checkIn, date),
        gt(reservations.checkOut, date),
        inArray(reservations.status, ['pending', 'confirmed', 'checked_in']),
      ),
    );

  const occupiedIds = new Set(occupiedRows.map((r) => r.roomId));
  const blockedIds = new Set(blocksRows.map((b) => b.roomId));

  const typeMap = new Map<
    string,
    {
      roomTypeId: string;
      roomTypeName: string;
      totalCount: number;
      freeRooms: { id: string; roomNumber: string }[];
    }
  >();

  for (const r of allRooms) {
    if (!typeMap.has(r.roomTypeId)) {
      typeMap.set(r.roomTypeId, {
        roomTypeId: r.roomTypeId,
        roomTypeName: r.roomTypeName,
        totalCount: 0,
        freeRooms: [],
      });
    }
    const group = typeMap.get(r.roomTypeId)!;
    group.totalCount += 1;

    const isFree =
      r.status === 'active' && !occupiedIds.has(r.id) && !blockedIds.has(r.id);

    if (isFree) {
      group.freeRooms.push({ id: r.id, roomNumber: r.roomNumber });
    }
  }

  return {
    date,
    arrivals: arrivalsRows.map((r) => ({
      ...r,
      roomId: r.roomId!,
    })),
    departures: departuresRows.map((r) => ({
      ...r,
      roomId: r.roomId!,
    })),
    inHouse: inHouseRows.map((r) => ({
      ...r,
      roomId: r.roomId!,
    })),
    blocks: blocksRows.map((b) => ({
      id: b.id,
      roomId: b.roomId,
      roomNumber: b.roomNumber,
      roomTypeName: b.roomTypeName,
      reason: b.reason as CalendarDayResponse['blocks'][number]['reason'],
      notes: b.notes,
      startDate: b.startDate,
      endDate: b.endDate,
    })),
    freeRoomsByType: Array.from(typeMap.values()).map((g) => ({
      roomTypeId: g.roomTypeId,
      roomTypeName: g.roomTypeName,
      totalCount: g.totalCount,
      freeCount: g.freeRooms.length,
      availableRooms: g.freeRooms,
    })),
  };
}

export async function checkBlockConflicts(options: {
  roomIds: string[];
  startDate: string;
  endDate: string;
  excludeBlockId?: string;
}): Promise<BlockCheckResponse> {
  const { roomIds, startDate, endDate, excludeBlockId } = options;
  if (!roomIds.length) return { ok: true, conflicts: [] };

  const conflicts: BlockCheckConflict[] = [];

  // 1. Check reservation conflicts
  const overlappingRes = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      roomId: reservations.roomId,
      roomNumber: rooms.roomNumber,
      guestName: reservations.guestName,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
      status: reservations.status,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(
      and(
        inArray(reservations.roomId, roomIds),
        sql`daterange(${reservations.checkIn}, ${reservations.checkOut}, '[)') && daterange(${startDate}::date, ${endDate}::date, '[)')`,
        inArray(reservations.status, ['pending', 'confirmed', 'checked_in']),
      ),
    );

  for (const r of overlappingRes) {
    conflicts.push({
      roomId: r.roomId!,
      roomNumber: r.roomNumber,
      type: 'reservation',
      id: r.id,
      reference: r.reference,
      guestName: r.guestName,
      startDate: r.checkIn,
      endDate: r.checkOut,
      status: r.status,
    });
  }

  // 2. Check other room block conflicts
  const blockConditions = [
    inArray(roomBlocks.roomId, roomIds),
    sql`daterange(${roomBlocks.startDate}, ${roomBlocks.endDate}, '[)') && daterange(${startDate}::date, ${endDate}::date, '[)')`,
  ];
  if (excludeBlockId) {
    blockConditions.push(ne(roomBlocks.id, excludeBlockId));
  }

  const overlappingBlocks = await db
    .select({
      id: roomBlocks.id,
      roomId: roomBlocks.roomId,
      roomNumber: rooms.roomNumber,
      startDate: roomBlocks.startDate,
      endDate: roomBlocks.endDate,
      reason: roomBlocks.reason,
    })
    .from(roomBlocks)
    .innerJoin(rooms, eq(roomBlocks.roomId, rooms.id))
    .where(and(...blockConditions));

  for (const b of overlappingBlocks) {
    conflicts.push({
      roomId: b.roomId,
      roomNumber: b.roomNumber,
      type: 'block',
      id: b.id,
      startDate: b.startDate,
      endDate: b.endDate,
      reason: b.reason,
    });
  }

  return {
    ok: conflicts.length === 0,
    conflicts,
  };
}

export async function bulkCreateRoomBlocks(
  data: {
    roomIds: string[];
    startDate: string;
    endDate: string;
    reason: 'maintenance' | 'owner_hold' | 'renovation' | 'other';
    notes?: string;
    backdateReason?: string;
    idempotencyKey: string;
  },
  staffUser: {
    id: string;
    role?: 'owner' | 'manager' | 'reception';
    email?: string;
  },
  ipAddress?: string,
): Promise<{ ok: boolean; count: number; conflicts?: BlockCheckConflict[] }> {
  // Pre-flight conflict check
  const conflictCheck = await checkBlockConflicts({
    roomIds: data.roomIds,
    startDate: data.startDate,
    endDate: data.endDate,
  });

  if (!conflictCheck.ok) {
    return {
      ok: false,
      count: 0,
      conflicts: conflictCheck.conflicts,
    };
  }

  // Atomic bulk creation inside a transaction
  return await db.transaction(async (tx) => {
    let createdCount = 0;

    for (const roomId of data.roomIds) {
      const [block] = await tx
        .insert(roomBlocks)
        .values({
          roomId,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
          notes: data.notes || null,
          createdBy: staffUser.id,
        })
        .returning();

      createdCount += 1;

      // Audit log entry
      await createAuditLog({
        actorId: staffUser.id,
        actorRole: staffUser.role,
        action: 'block.create',
        entity: 'room_block',
        entityId: block.id,
        changes: {
          before: null,
          after: {
            roomId,
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason,
            notes: data.notes,
            backdateReason: data.backdateReason,
            idempotencyKey: data.idempotencyKey,
          },
        },
        ipAddress: ipAddress ?? null,
      });
    }

    return { ok: true, count: createdCount };
  });
}

export async function updateRoomBlockAdmin(
  id: string,
  data: {
    roomId: string;
    startDate: string;
    endDate: string;
    reason: 'maintenance' | 'owner_hold' | 'renovation' | 'other';
    notes?: string;
    backdateReason?: string;
    version: string;
  },
  staffUser: {
    id: string;
    role?: 'owner' | 'manager' | 'reception';
    email?: string;
  },
  ipAddress?: string,
): Promise<{
  ok: boolean;
  block?: unknown;
  conflicts?: BlockCheckConflict[];
  stale?: boolean;
}> {
  const [existing] = await db
    .select()
    .from(roomBlocks)
    .where(eq(roomBlocks.id, id))
    .limit(1);

  if (!existing) {
    return { ok: false };
  }

  // Optimistic version check
  if (existing.updatedAt.toISOString() !== data.version) {
    return { ok: false, stale: true };
  }

  // Check conflicts
  const conflictCheck = await checkBlockConflicts({
    roomIds: [data.roomId],
    startDate: data.startDate,
    endDate: data.endDate,
    excludeBlockId: id,
  });

  if (!conflictCheck.ok) {
    return { ok: false, conflicts: conflictCheck.conflicts };
  }

  const [updated] = await db
    .update(roomBlocks)
    .set({
      roomId: data.roomId,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(roomBlocks.id, id))
    .returning();

  await createAuditLog({
    actorId: staffUser.id,
    actorRole: staffUser.role,
    action: 'block.update',
    entity: 'room_block',
    entityId: id,
    changes: {
      before: {
        roomId: existing.roomId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        reason: existing.reason,
        notes: existing.notes,
      },
      after: {
        roomId: data.roomId,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        notes: data.notes,
        backdateReason: data.backdateReason,
      },
    },
    ipAddress: ipAddress ?? null,
  });

  return { ok: true, block: updated };
}

export async function deleteRoomBlockAdmin(
  id: string,
  staffUser: {
    id: string;
    role?: 'owner' | 'manager' | 'reception';
    email?: string;
  },
  ipAddress?: string,
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(roomBlocks)
    .where(eq(roomBlocks.id, id))
    .limit(1);

  if (!existing) return false;

  await db.delete(roomBlocks).where(eq(roomBlocks.id, id));

  await createAuditLog({
    actorId: staffUser.id,
    actorRole: staffUser.role,
    action: 'block.delete',
    entity: 'room_block',
    entityId: id,
    changes: {
      before: {
        roomId: existing.roomId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        reason: existing.reason,
        notes: existing.notes,
      },
      after: null,
    },
    ipAddress: ipAddress ?? null,
  });

  return true;
}

export async function listBlocksPaginated(params: {
  page: number;
  pageSize: number;
  roomTypeId?: string;
  roomId?: string;
  reason?: 'maintenance' | 'owner_hold' | 'renovation' | 'other';
  status: 'all' | 'upcoming' | 'current' | 'past';
  today: string;
}): Promise<RoomBlocksListResponse> {
  const { page, pageSize, roomTypeId, roomId, reason, status, today } = params;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (roomTypeId) {
    conditions.push(eq(rooms.roomTypeId, roomTypeId));
  }
  if (roomId) {
    conditions.push(eq(roomBlocks.roomId, roomId));
  }
  if (reason) {
    conditions.push(eq(roomBlocks.reason, reason));
  }
  if (status === 'upcoming') {
    conditions.push(gt(roomBlocks.startDate, today));
  } else if (status === 'current') {
    conditions.push(
      and(lte(roomBlocks.startDate, today), gt(roomBlocks.endDate, today)),
    );
  } else if (status === 'past') {
    conditions.push(lte(roomBlocks.endDate, today));
  }

  const whereClause = conditions.length ? and(...conditions) : sql`1=1`;

  // Count total
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomBlocks)
    .innerJoin(rooms, eq(roomBlocks.roomId, rooms.id))
    .where(whereClause);

  // Fetch paginated rows
  const rows = await db
    .select({
      id: roomBlocks.id,
      roomId: roomBlocks.roomId,
      roomNumber: rooms.roomNumber,
      roomTypeId: rooms.roomTypeId,
      roomTypeName: roomTypes.name,
      startDate: roomBlocks.startDate,
      endDate: roomBlocks.endDate,
      reason: roomBlocks.reason,
      notes: roomBlocks.notes,
      createdBy: roomBlocks.createdBy,
      createdByName: sql<string>`concat(${staffUsers.firstName}, ' ', ${staffUsers.lastName})`,
      createdAt: roomBlocks.createdAt,
      updatedAt: roomBlocks.updatedAt,
    })
    .from(roomBlocks)
    .innerJoin(rooms, eq(roomBlocks.roomId, rooms.id))
    .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
    .leftJoin(staffUsers, eq(roomBlocks.createdBy, staffUsers.id))
    .where(whereClause)
    .orderBy(desc(roomBlocks.startDate))
    .limit(pageSize)
    .offset(offset);

  const blocks: RoomBlockListItem[] = rows.map((r) => ({
    id: r.id,
    roomId: r.roomId,
    roomNumber: r.roomNumber,
    roomTypeId: r.roomTypeId,
    roomTypeName: r.roomTypeName,
    startDate: r.startDate,
    endDate: r.endDate,
    nights: nightsBetween(r.startDate, r.endDate),
    reason: r.reason as RoomBlockListItem['reason'],
    notes: r.notes,
    createdBy: r.createdBy,
    createdByName: r.createdByName?.trim() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return {
    blocks,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}

// Helper functions for comparison
function lt(a: unknown, b: unknown) {
  return sql`${a} < ${b}`;
}
function gt(a: unknown, b: unknown) {
  return sql`${a} > ${b}`;
}
