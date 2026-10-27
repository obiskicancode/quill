import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import {
  auditLogs,
  enquiries,
  notificationLogs,
  payments,
  refunds,
  reservations,
  reservationStatusHistory,
  roomBlocks,
  rooms,
  roomTypes,
} from '@/db/schema';
import { addDays, fromISO } from '@/lib/dates';
import type {
  ActivityEvent,
  AttentionItem,
  DashboardKpi,
  DashboardReservationRow,
  OccupancyDay,
  RevenueData,
  RevenuePeriod,
  RevenueRange,
} from '@/types/dashboard.types';
import type { ISODate } from '@/types/dates.types';

function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

/**
 * KPI Definitions applied:
 * - Arrivals today: reservations with check_in = today AND status IN ('confirmed', 'pending')
 * - Departures today: reservations with check_out = today AND status = 'checked_in'
 * - In-house tonight: reservations with status = 'checked_in' OR (status = 'confirmed' AND check_in <= today < check_out)
 * - Occupancy tonight: occupied rooms / sellable rooms (active, not blocked tonight)
 */
export async function getDashboardKpi(today: ISODate): Promise<DashboardKpi> {
  // 1. Total rooms and maintenance/blocked rooms
  const allActiveRooms = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.isActive, true), eq(rooms.status, 'active')));

  const totalRoomsCount = allActiveRooms.length;

  // Blocked rooms tonight (either maintenance in room status or an active room_block covering today)
  const blockedRows = await db
    .select({ roomId: roomBlocks.roomId })
    .from(roomBlocks)
    .where(
      and(
        lte(roomBlocks.startDate, today),
        sql`${roomBlocks.endDate} > ${today}::date`,
      ),
    );

  const blockedRoomIds = new Set(blockedRows.map((r) => r.roomId));
  const blockedRoomsCount = blockedRoomIds.size;
  const sellableRoomsCount = Math.max(0, totalRoomsCount - blockedRoomsCount);

  // 2. Arrivals today: check_in = today and status in ('confirmed', 'pending')
  const arrivalsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reservations)
    .where(
      and(
        eq(reservations.checkIn, today),
        sql`${reservations.status} IN ('confirmed', 'pending')`,
      ),
    );
  const arrivalsToday = arrivalsResult[0]?.count ?? 0;

  // 3. Departures today: check_out = today and status = 'checked_in'
  const departuresResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reservations)
    .where(
      and(
        eq(reservations.checkOut, today),
        eq(reservations.status, 'checked_in'),
      ),
    );
  const departuresToday = departuresResult[0]?.count ?? 0;

  // 4. In-house tonight: status = 'checked_in' OR (status = 'confirmed' AND check_in <= today < check_out)
  const inHouseReservations = await db
    .select({ roomId: reservations.roomId })
    .from(reservations)
    .where(
      sql`(${reservations.status} = 'checked_in' OR (${reservations.status} = 'confirmed' AND ${reservations.checkIn} <= ${today}::date AND ${reservations.checkOut} > ${today}::date))`,
    );

  const inHouseTonight = inHouseReservations.length;
  // Distinct occupied rooms
  const occupiedRoomIds = new Set(inHouseReservations.map((r) => r.roomId));
  const occupiedRooms = occupiedRoomIds.size;

  const occupancyPercent =
    sellableRoomsCount > 0
      ? Math.min(100, Math.round((occupiedRooms / sellableRoomsCount) * 100))
      : 0;

  return {
    arrivalsToday,
    departuresToday,
    inHouseTonight,
    occupiedRooms,
    sellableRooms: sellableRoomsCount,
    totalRooms: totalRoomsCount,
    blockedRooms: blockedRoomsCount,
    occupancyPercent,
  };
}

/**
 * Needs attention items prioritized list:
 * 1. Bank transfers awaiting verification (oldest age)
 * 2. Reservations awaiting hotel approval (manual approval mode)
 * 3. Holds expiring in the next 10 minutes
 * 4. New enquiries unanswered for more than 24 hours
 * 5. Failed notifications in the last 24 hours
 * 6. Reservations with balance due arriving within 48 hours
 */
export async function getDashboardAttentionItems(
  today: ISODate,
  now: Date = new Date(),
): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];

  // 1. Bank transfers awaiting verification
  const pendingBankTransfers = await db
    .select({
      id: payments.id,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(
      and(
        eq(payments.provider, 'bank_transfer'),
        eq(payments.status, 'pending'),
      ),
    )
    .orderBy(payments.createdAt);

  if (pendingBankTransfers.length > 0) {
    const oldest = pendingBankTransfers[0].createdAt;
    items.push({
      type: 'bank_transfer_pending',
      count: pendingBankTransfers.length,
      label: 'Bank transfers awaiting verification',
      oldestAge: formatRelativeTime(oldest, now),
      oldestAt: oldest.toISOString(),
      href: '/admin/payments?status=pending&provider=bank_transfer',
      priority: 1,
    });
  }

  // 2. Reservations awaiting hotel approval
  const awaitingApproval = await db
    .select({
      id: reservations.id,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.confirmationMode, 'manual_approval'),
        eq(reservations.status, 'pending'),
      ),
    )
    .orderBy(reservations.createdAt);

  if (awaitingApproval.length > 0) {
    const oldest = awaitingApproval[0].createdAt;
    items.push({
      type: 'reservation_awaiting_approval',
      count: awaitingApproval.length,
      label: 'Reservations awaiting hotel approval',
      oldestAge: formatRelativeTime(oldest, now),
      oldestAt: oldest.toISOString(),
      href: '/admin/reservations?status=pending&mode=manual_approval',
      priority: 2,
    });
  }

  // 3. Holds expiring in the next 10 minutes
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  const expiringHolds = await db
    .select({
      id: reservations.id,
      holdExpiresAt: reservations.holdExpiresAt,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.status, 'pending'),
        sql`${reservations.holdExpiresAt} IS NOT NULL`,
        sql`${reservations.holdExpiresAt} > ${now.toISOString()}`,
        sql`${reservations.holdExpiresAt} <= ${tenMinutesFromNow.toISOString()}`,
      ),
    )
    .orderBy(reservations.holdExpiresAt);

  if (expiringHolds.length > 0) {
    const oldest = expiringHolds[0].holdExpiresAt!;
    items.push({
      type: 'hold_expiring_soon',
      count: expiringHolds.length,
      label: 'Holds expiring in next 10 minutes',
      oldestAge: formatRelativeTime(oldest, now),
      oldestAt: oldest.toISOString(),
      href: '/admin/reservations?status=pending&expiring=1',
      priority: 3,
    });
  }

  // 4. New enquiries unanswered for > 24 hours
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const unansweredEnquiries = await db
    .select({
      id: enquiries.id,
      createdAt: enquiries.createdAt,
    })
    .from(enquiries)
    .where(
      and(
        eq(enquiries.status, 'new'),
        eq(enquiries.isSpam, false),
        lte(enquiries.createdAt, twentyFourHoursAgo),
      ),
    )
    .orderBy(enquiries.createdAt);

  if (unansweredEnquiries.length > 0) {
    const oldest = unansweredEnquiries[0].createdAt;
    items.push({
      type: 'enquiry_unanswered',
      count: unansweredEnquiries.length,
      label: 'New enquiries unanswered for >24h',
      oldestAge: formatRelativeTime(oldest, now),
      oldestAt: oldest.toISOString(),
      href: '/admin/enquiries?status=new',
      priority: 4,
    });
  }

  // 5. Failed notifications in the last 24 hours
  const failedNotifications = await db
    .select({
      id: notificationLogs.id,
      createdAt: notificationLogs.createdAt,
    })
    .from(notificationLogs)
    .where(
      and(
        eq(notificationLogs.status, 'failed'),
        sql`${notificationLogs.channel} IN ('email', 'whatsapp')`,
        gte(notificationLogs.createdAt, twentyFourHoursAgo),
      ),
    )
    .orderBy(notificationLogs.createdAt);

  if (failedNotifications.length > 0) {
    const oldest = failedNotifications[0].createdAt;
    items.push({
      type: 'notification_failed',
      count: failedNotifications.length,
      label: 'Failed notifications in last 24h',
      oldestAge: formatRelativeTime(oldest, now),
      oldestAt: oldest.toISOString(),
      href: '/admin/settings?tab=notifications&status=failed',
      priority: 5,
    });
  }

  // 6. Reservations with a balance due arriving within 48 hours
  const twoDaysLater = addDays(today, 2);
  const balanceDueArrivals = await db
    .select({
      id: reservations.id,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .where(
      and(
        sql`${reservations.status} IN ('confirmed', 'pending')`,
        sql`${reservations.balanceMinor} > 0`,
        gte(reservations.checkIn, today),
        lte(reservations.checkIn, twoDaysLater),
      ),
    )
    .orderBy(reservations.checkIn, reservations.createdAt);

  if (balanceDueArrivals.length > 0) {
    const oldest = balanceDueArrivals[0].createdAt;
    items.push({
      type: 'balance_due_arriving_soon',
      count: balanceDueArrivals.length,
      label: 'Balance due arriving within 48 hours',
      oldestAge: formatRelativeTime(oldest, now),
      oldestAt: oldest.toISOString(),
      href: '/admin/reservations?balance=due&arriving_soon=1',
      priority: 6,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

/**
 * Arrivals today: check_in = today AND status IN ('confirmed', 'pending')
 */
export async function getArrivalsToday(
  today: ISODate,
): Promise<DashboardReservationRow[]> {
  const rows = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      guestName: reservations.guestName,
      roomTypeName: roomTypes.name,
      roomNumber: rooms.roomNumber,
      nights: reservations.nights,
      adults: reservations.adults,
      children: reservations.children,
      balanceMinor: reservations.balanceMinor,
      status: reservations.status,
      arrivalTime: reservations.arrivalTime,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id))
    .where(
      and(
        eq(reservations.checkIn, today),
        sql`${reservations.status} IN ('confirmed', 'pending')`,
      ),
    )
    .orderBy(reservations.arrivalTime, reservations.guestName);

  return rows;
}

/**
 * Departures today: check_out = today AND status = 'checked_in'
 */
export async function getDeparturesToday(
  today: ISODate,
): Promise<DashboardReservationRow[]> {
  const rows = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      guestName: reservations.guestName,
      roomTypeName: roomTypes.name,
      roomNumber: rooms.roomNumber,
      nights: reservations.nights,
      adults: reservations.adults,
      children: reservations.children,
      balanceMinor: reservations.balanceMinor,
      status: reservations.status,
      arrivalTime: reservations.arrivalTime,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id))
    .where(
      and(
        eq(reservations.checkOut, today),
        eq(reservations.status, 'checked_in'),
      ),
    )
    .orderBy(reservations.guestName);

  return rows;
}

/**
 * Next 14 days occupancy
 */
export async function getDashboardOccupancy(
  startDate: ISODate,
  days = 14,
): Promise<OccupancyDay[]> {
  const activeRooms = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.isActive, true), eq(rooms.status, 'active')));
  const totalActive = activeRooms.length;

  const result: OccupancyDay[] = [];

  for (let i = 0; i < days; i++) {
    const current = addDays(startDate, i);

    // Blocked rooms on this day
    const blocked = await db
      .select({ roomId: roomBlocks.roomId })
      .from(roomBlocks)
      .where(
        and(
          lte(roomBlocks.startDate, current),
          sql`${roomBlocks.endDate} > ${current}::date`,
        ),
      );
    const blockedCount = new Set(blocked.map((b) => b.roomId)).size;
    const sellable = Math.max(0, totalActive - blockedCount);

    // Occupied rooms on this day (checked_in or confirmed where check_in <= current < check_out)
    const inHouse = await db
      .select({ roomId: reservations.roomId })
      .from(reservations)
      .where(
        sql`(${reservations.status} = 'checked_in' OR ${reservations.status} = 'confirmed') AND ${reservations.checkIn} <= ${current}::date AND ${reservations.checkOut} > ${current}::date`,
      );
    const occupiedCount = new Set(inHouse.map((r) => r.roomId)).size;

    // Arrivals on this day
    const arrivals = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.checkIn, current),
          sql`${reservations.status} IN ('confirmed', 'checked_in')`,
        ),
      );

    // Departures on this day
    const departures = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.checkOut, current),
          sql`${reservations.status} IN ('checked_in', 'checked_out')`,
        ),
      );

    const occupancyPercent =
      sellable > 0
        ? Math.min(100, Math.round((occupiedCount / sellable) * 100))
        : 0;

    result.push({
      date: current,
      occupied: occupiedCount,
      available: Math.max(0, sellable - occupiedCount),
      sellable,
      arrivals: arrivals[0]?.count ?? 0,
      departures: departures[0]?.count ?? 0,
      occupancyPercent,
    });
  }

  return result;
}

/**
 * Revenue Summary
 * Current and previous period calculation:
 * - payments received: sum of payments paid minus refunds in the range
 * - new bookings count: count of reservations created in range
 * - average nightly rate: revenue / total nights booked in period
 * - cancellations count: cancellations recorded in period
 */
export async function getDashboardRevenue(
  range: RevenueRange,
  today: ISODate,
): Promise<RevenueData> {
  const getPeriodBounds = (
    r: RevenueRange,
  ): { currStart: Date; currEnd: Date; prevStart: Date; prevEnd: Date } => {
    const todayObj = fromISO(today);

    if (r === 'today') {
      const currStart = new Date(todayObj.getTime());
      const currEnd = new Date(todayObj.getTime() + 86400000 - 1);
      const prevStart = new Date(todayObj.getTime() - 86400000);
      const prevEnd = new Date(todayObj.getTime() - 1);
      return { currStart, currEnd, prevStart, prevEnd };
    }

    if (r === '7d') {
      const currStart = new Date(todayObj.getTime() - 6 * 86400000);
      const currEnd = new Date(todayObj.getTime() + 86400000 - 1);
      const prevStart = new Date(todayObj.getTime() - 13 * 86400000);
      const prevEnd = new Date(todayObj.getTime() - 6 * 86400000 - 1);
      return { currStart, currEnd, prevStart, prevEnd };
    }

    if (r === 'this_month') {
      const y = todayObj.getFullYear();
      const m = todayObj.getMonth();
      const currStart = new Date(y, m, 1);
      const currEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
      const prevStart = new Date(y, m - 1, 1);
      const prevEnd = new Date(y, m, 0, 23, 59, 59, 999);
      return { currStart, currEnd, prevStart, prevEnd };
    }

    // last_month
    const y = todayObj.getFullYear();
    const m = todayObj.getMonth();
    const currStart = new Date(y, m - 1, 1);
    const currEnd = new Date(y, m, 0, 23, 59, 59, 999);
    const prevStart = new Date(y, m - 2, 1);
    const prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
    return { currStart, currEnd, prevStart, prevEnd };
  };

  const { currStart, currEnd, prevStart, prevEnd } = getPeriodBounds(range);

  async function calculatePeriodMetrics(
    start: Date,
    end: Date,
  ): Promise<RevenuePeriod> {
    // Paid payments sum
    const paidResult = await db
      .select({
        total: sql<number>`coalesce(sum(${payments.amountMinor}), 0)::int`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'paid'),
          sql`${payments.type} != 'refund'`,
          gte(payments.paidAt, start),
          lte(payments.paidAt, end),
        ),
      );

    // Refunded payments or refund table
    const refundResult = await db
      .select({
        total: sql<number>`coalesce(sum(${refunds.amountMinor}), 0)::int`,
      })
      .from(refunds)
      .where(
        and(
          eq(refunds.status, 'processed'),
          gte(refunds.processedAt, start),
          lte(refunds.processedAt, end),
        ),
      );

    const paymentsReceivedMinor = Math.max(
      0,
      (paidResult[0]?.total ?? 0) - (refundResult[0]?.total ?? 0),
    );

    // New bookings in this period
    const bookingsResult = await db
      .select({
        count: sql<number>`count(*)::int`,
        nights: sql<number>`coalesce(sum(${reservations.nights}), 0)::int`,
        subtotal: sql<number>`coalesce(sum(${reservations.subtotalMinor}), 0)::int`,
      })
      .from(reservations)
      .where(
        and(
          sql`${reservations.status} NOT IN ('cancelled', 'expired')`,
          gte(reservations.createdAt, start),
          lte(reservations.createdAt, end),
        ),
      );

    const newBookings = bookingsResult[0]?.count ?? 0;
    const totalNights = bookingsResult[0]?.nights ?? 0;
    const totalSubtotal = bookingsResult[0]?.subtotal ?? 0;

    const avgNightlyRateMinor =
      totalNights > 0 ? Math.round(totalSubtotal / totalNights) : 0;

    // Cancellations count in this period
    const cancellationsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.status, 'cancelled'),
          gte(reservations.cancelledAt, start),
          lte(reservations.cancelledAt, end),
        ),
      );
    const cancellations = cancellationsResult[0]?.count ?? 0;

    return {
      paymentsReceivedMinor,
      newBookings,
      avgNightlyRateMinor,
      cancellations,
    };
  }

  const [current, previous] = await Promise.all([
    calculatePeriodMetrics(currStart, currEnd),
    calculatePeriodMetrics(prevStart, prevEnd),
  ]);

  const calcChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return {
    range,
    current,
    previous,
    changePercent: {
      payments: calcChange(
        current.paymentsReceivedMinor,
        previous.paymentsReceivedMinor,
      ),
      bookings: calcChange(current.newBookings, previous.newBookings),
      avgRate: calcChange(
        current.avgNightlyRateMinor,
        previous.avgNightlyRateMinor,
      ),
      cancellations: calcChange(current.cancellations, previous.cancellations),
    },
  };
}

/**
 * Recent Activity (last 10 events)
 */
export async function getDashboardActivity(
  limit = 10,
  now: Date = new Date(),
): Promise<ActivityEvent[]> {
  // Query status history, enquiries, and payments
  const [historyRows, enquiryRows, paymentRows] = await Promise.all([
    db
      .select({
        id: reservationStatusHistory.id,
        toStatus: reservationStatusHistory.toStatus,
        createdAt: reservationStatusHistory.createdAt,
        reference: reservations.reference,
        guestName: reservations.guestName,
      })
      .from(reservationStatusHistory)
      .innerJoin(
        reservations,
        eq(reservationStatusHistory.reservationId, reservations.id),
      )
      .orderBy(desc(reservationStatusHistory.createdAt))
      .limit(limit),

    db
      .select({
        id: enquiries.id,
        name: enquiries.name,
        subject: enquiries.subject,
        createdAt: enquiries.createdAt,
      })
      .from(enquiries)
      .orderBy(desc(enquiries.createdAt))
      .limit(limit),

    db
      .select({
        id: payments.id,
        amountMinor: payments.amountMinor,
        createdAt: payments.createdAt,
        reference: reservations.reference,
      })
      .from(payments)
      .innerJoin(reservations, eq(payments.reservationId, reservations.id))
      .where(eq(payments.status, 'paid'))
      .orderBy(desc(payments.createdAt))
      .limit(limit),
  ]);

  const events: ActivityEvent[] = [];

  for (const h of historyRows) {
    if (h.toStatus === 'confirmed') {
      events.push({
        id: `status-${h.id}`,
        type: 'new_booking',
        label: `Booking confirmed: ${h.reference} (${h.guestName})`,
        relativeTime: formatRelativeTime(h.createdAt, now),
        timestamp: h.createdAt.toISOString(),
        href: `/admin/reservations?ref=${h.reference}`,
      });
    } else if (h.toStatus === 'checked_in') {
      events.push({
        id: `status-${h.id}`,
        type: 'check_in',
        label: `Checked in: ${h.reference} (${h.guestName})`,
        relativeTime: formatRelativeTime(h.createdAt, now),
        timestamp: h.createdAt.toISOString(),
        href: `/admin/reservations?ref=${h.reference}`,
      });
    } else if (h.toStatus === 'checked_out') {
      events.push({
        id: `status-${h.id}`,
        type: 'check_out',
        label: `Checked out: ${h.reference} (${h.guestName})`,
        relativeTime: formatRelativeTime(h.createdAt, now),
        timestamp: h.createdAt.toISOString(),
        href: `/admin/reservations?ref=${h.reference}`,
      });
    } else if (h.toStatus === 'cancelled') {
      events.push({
        id: `status-${h.id}`,
        type: 'cancellation',
        label: `Booking cancelled: ${h.reference}`,
        relativeTime: formatRelativeTime(h.createdAt, now),
        timestamp: h.createdAt.toISOString(),
        href: `/admin/reservations?ref=${h.reference}`,
      });
    }
  }

  for (const e of enquiryRows) {
    events.push({
      id: `enquiry-${e.id}`,
      type: 'new_enquiry',
      label: `New enquiry from ${e.name}: "${e.subject || 'Room question'}"`,
      relativeTime: formatRelativeTime(e.createdAt, now),
      timestamp: e.createdAt.toISOString(),
      href: `/admin/enquiries?id=${e.id}`,
    });
  }

  for (const p of paymentRows) {
    events.push({
      id: `payment-${p.id}`,
      type: 'payment_received',
      label: `Payment received for ${p.reference} (₦${(p.amountMinor / 100).toLocaleString()})`,
      relativeTime: formatRelativeTime(p.createdAt, now),
      timestamp: p.createdAt.toISOString(),
      href: `/admin/payments?ref=${p.reference}`,
    });
  }

  // Sort unified events by timestamp descending and take top N
  return events
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit);
}

/**
 * Check-in Quick Action
 * Validates transition from confirmed -> checked_in
 */
export async function checkInReservation(
  reservationId: string,
  staffUserId: string,
): Promise<DashboardReservationRow> {
  const [res] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (!res) {
    throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND_BARE);
  }

  if (res.status !== 'confirmed') {
    throw new Error(ERROR_MESSAGES.CANNOT_CHECK_IN_STATUS(res.status));
  }

  const now = new Date();

  // Run update + status history + audit log in transaction
  await db.transaction(async (tx) => {
    await tx
      .update(reservations)
      .set({
        status: 'checked_in',
        checkedInAt: now,
        updatedAt: now,
      })
      .where(eq(reservations.id, reservationId));

    await tx.insert(reservationStatusHistory).values({
      reservationId,
      fromStatus: 'confirmed',
      toStatus: 'checked_in',
      reason: 'Staff check-in via dashboard quick action',
      changedBy: staffUserId,
    });

    await tx.insert(auditLogs).values({
      actorId: staffUserId,
      entity: 'reservation',
      entityId: reservationId,
      action: 'check_in',
      reason: 'Dashboard check-in',
      changes: {
        status: { from: 'confirmed', to: 'checked_in' },
        checkedInAt: now.toISOString(),
      },
    });
  });

  const [updated] = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      guestName: reservations.guestName,
      roomTypeName: roomTypes.name,
      roomNumber: rooms.roomNumber,
      nights: reservations.nights,
      adults: reservations.adults,
      children: reservations.children,
      balanceMinor: reservations.balanceMinor,
      status: reservations.status,
      arrivalTime: reservations.arrivalTime,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);

  return updated;
}

/**
 * Check-out Quick Action
 * Validates transition from checked_in -> checked_out
 */
export async function checkOutReservation(
  reservationId: string,
  staffUserId: string,
): Promise<DashboardReservationRow> {
  const [res] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (!res) {
    throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND_BARE);
  }

  if (res.status !== 'checked_in') {
    throw new Error(ERROR_MESSAGES.CANNOT_CHECK_OUT_STATUS(res.status));
  }

  const now = new Date();

  // Run update + status history + audit log in transaction
  await db.transaction(async (tx) => {
    await tx
      .update(reservations)
      .set({
        status: 'checked_out',
        checkedOutAt: now,
        updatedAt: now,
      })
      .where(eq(reservations.id, reservationId));

    await tx.insert(reservationStatusHistory).values({
      reservationId,
      fromStatus: 'checked_in',
      toStatus: 'checked_out',
      reason: 'Staff check-out via dashboard quick action',
      changedBy: staffUserId,
    });

    await tx.insert(auditLogs).values({
      actorId: staffUserId,
      entity: 'reservation',
      entityId: reservationId,
      action: 'check_out',
      reason: 'Dashboard check-out',
      changes: {
        status: { from: 'checked_in', to: 'checked_out' },
        checkedOutAt: now.toISOString(),
      },
    });
  });

  const [updated] = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      guestName: reservations.guestName,
      roomTypeName: roomTypes.name,
      roomNumber: rooms.roomNumber,
      nights: reservations.nights,
      adults: reservations.adults,
      children: reservations.children,
      balanceMinor: reservations.balanceMinor,
      status: reservations.status,
      arrivalTime: reservations.arrivalTime,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);

  return updated;
}
