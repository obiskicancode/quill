import { and, desc, eq, gte, lte, or, sql } from 'drizzle-orm';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import {
  auditLogs,
  hotelSettings,
  notificationLogs,
  paymentProofs,
  payments,
  reservationExtras,
  reservationNights,
  reservations,
  reservationStatusHistory,
  roomBlocks,
  rooms,
  roomTypes,
  staffUsers,
} from '@/db/schema';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { addDays, fromISO, nightsBetween } from '@/lib/dates';
import { createReference } from '@/lib/db/reference';
import { findAvailableRoom } from '@/lib/db/repositories/rooms.repo';
import {
  computeBalanceDue,
  computePaymentState,
} from '@/lib/reservations/payment-state';
import type { AdminRole } from '@/types/auth.types';
import type { ISODate } from '@/types/dates.types';
import type {
  AdminAllowedActions,
  AdminCancelInput,
  AdminChangeDatesInput,
  AdminCreateReservationInput,
  AdminEditDetailsInput,
  AdminNoShowInput,
  AdminRecordPaymentInput,
  AdminRefundInput,
  ReservationAlertFlags,
  ReservationAuditEntry,
  ReservationDetail,
  ReservationExtraItem,
  ReservationListItem,
  ReservationNeighbors,
  ReservationNightItem,
  ReservationNotificationLogItem,
  ReservationPaymentItem,
  ReservationPolicySnapshot,
  ReservationsListQueryParams,
  ReservationStatusHistoryItem,
} from '@/types/reservation.types';

export async function getFilterOptions() {
  const [types, allRooms] = await Promise.all([
    db
      .select({ id: roomTypes.id, name: roomTypes.name })
      .from(roomTypes)
      .where(eq(roomTypes.isActive, true))
      .orderBy(roomTypes.sortOrder, roomTypes.name),
    db
      .select({
        id: rooms.id,
        roomNumber: rooms.roomNumber,
        roomTypeId: rooms.roomTypeId,
      })
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .orderBy(rooms.roomNumber),
  ]);

  return { roomTypes: types, rooms: allRooms };
}

function buildWhereConditions(
  params: ReservationsListQueryParams,
  today: ISODate,
) {
  const conditions = [];

  // 1. Search Query
  if (params.q && params.q.trim().length > 0) {
    const rawQ = params.q.trim();
    const queryTerm = `%${rawQ}%`;
    const cleanPhone = `%${rawQ.replace(/[^0-9+]/g, '')}%`;

    conditions.push(
      or(
        sql`${reservations.reference} ILIKE ${queryTerm}`,
        sql`${reservations.guestName} ILIKE ${queryTerm}`,
        sql`${reservations.guestEmail} ILIKE ${queryTerm}`,
        sql`${reservations.guestPhone} ILIKE ${queryTerm}`,
        cleanPhone.length > 3
          ? sql`regexp_replace(${reservations.guestPhone}, '[^0-9+]', '', 'g') ILIKE ${cleanPhone}`
          : undefined,
        sql`${rooms.roomNumber} ILIKE ${queryTerm}`,
      ),
    );
  }

  // 2. Status multi-select
  if (params.status && params.status.length > 0) {
    conditions.push(
      sql`${reservations.status} = ANY(ARRAY[${sql.join(
        params.status.map((s) => sql`${s}`),
        sql`, `,
      )}]::reservation_status[])`,
    );
  }

  // 3. Date field filter
  if (params.dateField) {
    const field =
      params.dateField === 'check_out'
        ? reservations.checkOut
        : params.dateField === 'created_at'
          ? reservations.createdAt
          : reservations.checkIn;

    if (params.from) {
      if (params.dateField === 'created_at') {
        conditions.push(gte(field, new Date(`${params.from}T00:00:00Z`)));
      } else {
        conditions.push(sql`${field} >= ${params.from}::date`);
      }
    }
    if (params.to) {
      if (params.dateField === 'created_at') {
        conditions.push(lte(field, new Date(`${params.to}T23:59:59Z`)));
      } else {
        conditions.push(sql`${field} <= ${params.to}::date`);
      }
    }
  }

  // 4. Room & RoomType
  if (params.roomTypeId) {
    conditions.push(eq(reservations.roomTypeId, params.roomTypeId));
  }
  if (params.roomId) {
    conditions.push(eq(reservations.roomId, params.roomId));
  }

  // 5. Booking source
  if (params.source) {
    conditions.push(eq(reservations.bookingSource, params.source));
  }

  // 6. Payment state
  if (params.paymentState) {
    if (params.paymentState === 'refunded') {
      conditions.push(sql`${reservations.amountRefundedMinor} > 0`);
    } else if (params.paymentState === 'fully_paid') {
      conditions.push(
        sql`${reservations.amountPaidMinor} >= ${reservations.totalMinor} AND ${reservations.totalMinor} > 0 AND ${reservations.amountRefundedMinor} = 0`,
      );
    } else if (params.paymentState === 'deposit_paid') {
      conditions.push(
        sql`${reservations.amountPaidMinor} > 0 AND ${reservations.amountPaidMinor} < ${reservations.totalMinor} AND ${reservations.amountRefundedMinor} = 0`,
      );
    } else if (params.paymentState === 'unpaid') {
      conditions.push(
        sql`${reservations.amountPaidMinor} = 0 AND ${reservations.amountRefundedMinor} = 0`,
      );
    }
  }

  // 7. Quick filters
  if (params.filter) {
    if (params.filter === 'arriving_today') {
      conditions.push(
        and(
          eq(reservations.checkIn, today),
          sql`${reservations.status} IN ('confirmed', 'pending')`,
        ),
      );
    } else if (params.filter === 'departing_today') {
      conditions.push(
        and(
          eq(reservations.checkOut, today),
          eq(reservations.status, 'checked_in'),
        ),
      );
    } else if (params.filter === 'in_house') {
      conditions.push(
        sql`(${reservations.status} = 'checked_in' OR (${reservations.status} = 'confirmed' AND ${reservations.checkIn} <= ${today}::date AND ${reservations.checkOut} > ${today}::date))`,
      );
    } else if (params.filter === 'needs_attention') {
      const twoDaysLater = addDays(today, 2);
      conditions.push(
        or(
          sql`EXISTS (SELECT 1 FROM payments WHERE payments.reservation_id = ${reservations.id} AND payments.provider = 'bank_transfer' AND payments.status = 'pending')`,
          sql`(${reservations.confirmationMode} = 'manual_approval' AND ${reservations.status} = 'pending')`,
          sql`(${reservations.status} IN ('confirmed', 'pending') AND ${reservations.balanceMinor} > 0 AND ${reservations.checkIn} >= ${today}::date AND ${reservations.checkIn} <= ${twoDaysLater}::date)`,
        ),
      );
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getReservationsAdminList(
  params: ReservationsListQueryParams,
  today: ISODate,
  canViewGuestContact = true,
) {
  const where = buildWhereConditions(params, today);

  // Sort order allow-list
  const sortMap = {
    check_in: reservations.checkIn,
    created_at: reservations.createdAt,
    total_minor: reservations.totalMinor,
    guest_name: reservations.guestName,
  };

  const selectedSort = sortMap[params.sort] ?? reservations.checkIn;
  const orderDirection =
    params.order === 'desc' ? desc(selectedSort) : selectedSort;

  // Total count
  const countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id));

  if (where) {
    countQuery.where(where);
  }
  const countResult = await countQuery;
  const total = countResult[0]?.count ?? 0;

  // Paginated Rows
  const rowsQuery = db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      guestName: reservations.guestName,
      guestPhone: reservations.guestPhone,
      guestEmail: reservations.guestEmail,
      roomTypeId: reservations.roomTypeId,
      roomTypeName: roomTypes.name,
      roomId: reservations.roomId,
      roomNumber: rooms.roomNumber,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
      nights: reservations.nights,
      adults: reservations.adults,
      children: reservations.children,
      status: reservations.status,
      totalMinor: reservations.totalMinor,
      amountPaidMinor: reservations.amountPaidMinor,
      amountRefundedMinor: reservations.amountRefundedMinor,
      balanceMinor: reservations.balanceMinor,
      bookingSource: reservations.bookingSource,
      createdAt: reservations.createdAt,
      arrivalTime: reservations.arrivalTime,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id));

  if (where) {
    rowsQuery.where(where);
  }

  const rawRows = await rowsQuery
    .orderBy(orderDirection, desc(reservations.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const rows: ReservationListItem[] = rawRows.map((r) => {
    const paymentState = computePaymentState(
      r.totalMinor,
      r.amountPaidMinor,
      r.amountRefundedMinor,
    );
    const balanceMinor = computeBalanceDue(
      r.totalMinor,
      r.amountPaidMinor,
      r.amountRefundedMinor,
      r.status,
    );

    return {
      id: r.id,
      reference: r.reference,
      guestName: r.guestName,
      guestPhone: canViewGuestContact ? r.guestPhone : null,
      guestEmail: canViewGuestContact ? r.guestEmail : null,
      roomTypeId: r.roomTypeId,
      roomTypeName: r.roomTypeName,
      roomId: r.roomId,
      roomNumber: r.roomNumber,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      nights: r.nights,
      adults: r.adults,
      children: r.children,
      status: r.status,
      paymentState,
      totalMinor: r.totalMinor,
      amountPaidMinor: r.amountPaidMinor,
      amountRefundedMinor: r.amountRefundedMinor,
      balanceMinor,
      bookingSource: r.bookingSource,
      createdAt: r.createdAt.toISOString(),
      arrivalTime: r.arrivalTime,
    };
  });

  return {
    rows,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export function computeAllowedActions(
  res: typeof reservations.$inferSelect,
  role: AdminRole,
  today: ISODate,
  hasPendingProof: boolean,
  balanceMinor: number,
): AdminAllowedActions {
  const isManagerOrOwner = role === 'owner' || role === 'manager';
  const isPending = res.status === 'pending';
  const isConfirmed = res.status === 'confirmed';
  const isCheckedIn = res.status === 'checked_in';
  const isCheckedOut = res.status === 'checked_out';
  const isCancelled = res.status === 'cancelled';
  const isExpired = res.status === 'expired';
  const isNoShow = res.status === 'no_show';

  // 1. Edit Details: allowed in any status except cancelled and expired. Reception can edit details and email.
  const editDetailsAllowed = !isCancelled && !isExpired;

  // 2. Reassign Room: same room type only. Allowed for pending, confirmed, and checked_in.
  const reassignRoomAllowed = isPending || isConfirmed || isCheckedIn;

  // 3. Change Dates: pending or confirmed, before check-in. Manager and owner only.
  let changeDatesAllowed = false;
  let changeDatesReason: string | undefined;
  if (!isManagerOrOwner) {
    changeDatesReason = ERROR_MESSAGES.ONLY_MANAGERS_CHANGE_DATES;
  } else if (!isPending && !isConfirmed) {
    changeDatesReason = ERROR_MESSAGES.DATES_ONLY_PENDING_CONFIRMED;
  } else if (res.checkIn < today) {
    changeDatesReason = ERROR_MESSAGES.CANNOT_CHANGE_DATES_PAST;
  } else {
    changeDatesAllowed = true;
  }

  // 4. Cancel: pending or confirmed before check-in. Checked-in stays can only be ended through check-out. Manager/Owner.
  let cancelAllowed = false;
  let cancelReason: string | undefined;
  if (!isManagerOrOwner) {
    cancelReason = ERROR_MESSAGES.ONLY_MANAGERS_CANCEL;
  } else if (isCheckedIn) {
    cancelReason = ERROR_MESSAGES.CHECKED_IN_MUST_CHECKOUT;
  } else if (!isPending && !isConfirmed) {
    cancelReason = ERROR_MESSAGES.ONLY_PENDING_CONFIRMED_RESERVATIONS_CANCEL;
  } else {
    cancelAllowed = true;
  }

  // 5. Record Payment: manager and owner only.
  let recordPaymentAllowed = false;
  let recordPaymentReason: string | undefined;
  if (!isManagerOrOwner) {
    recordPaymentReason = ERROR_MESSAGES.ONLY_MANAGERS_RECORD_PAYMENTS;
  } else if (isCancelled || isExpired) {
    recordPaymentReason = ERROR_MESSAGES.CANNOT_RECORD_PAYMENT_CANCELLED;
  } else if (balanceMinor <= 0 && !isPending) {
    recordPaymentReason = ERROR_MESSAGES.RESERVATION_FULLY_PAID;
  } else {
    recordPaymentAllowed = true;
  }

  // 6. Refund: manager and owner only, against paid payment.
  let refundAllowed = false;
  let refundReason: string | undefined;
  if (!isManagerOrOwner) {
    refundReason = ERROR_MESSAGES.ONLY_MANAGERS_ISSUE_REFUNDS;
  } else if (res.amountPaidMinor <= res.amountRefundedMinor) {
    refundReason = ERROR_MESSAGES.NO_REFUNDABLE_BALANCE;
  } else {
    refundAllowed = true;
  }

  // 7. Verify Bank Transfer: manager and owner only.
  let verifyTransferAllowed = false;
  let verifyTransferReason: string | undefined;
  if (!isManagerOrOwner) {
    verifyTransferReason =
      'Only managers and owners can verify bank transfers.';
  } else if (!hasPendingProof) {
    verifyTransferReason =
      'No pending bank transfer proof awaiting verification.';
  } else {
    verifyTransferAllowed = true;
  }

  // 8. Approve: manager and owner only.
  let approveAllowed = false;
  let approveReason: string | undefined;
  if (!isManagerOrOwner) {
    approveReason = ERROR_MESSAGES.ONLY_MANAGERS_APPROVE;
  } else if (!isPending || res.confirmationMode !== 'manual_approval') {
    approveReason = ERROR_MESSAGES.RESERVATION_NOT_AWAITING_APPROVAL;
  } else {
    approveAllowed = true;
  }

  // 9. Decline: manager and owner only.
  let declineAllowed = false;
  let declineReason: string | undefined;
  if (!isManagerOrOwner) {
    declineReason = ERROR_MESSAGES.ONLY_MANAGERS_DECLINE;
  } else if (!isPending || res.confirmationMode !== 'manual_approval') {
    declineReason = ERROR_MESSAGES.RESERVATION_NOT_AWAITING_APPROVAL;
  } else {
    declineAllowed = true;
  }

  // 10. Mark No-Show: reception, manager, owner. Confirmed reservations after check-in date has begun.
  let noShowAllowed = false;
  let noShowReason: string | undefined;
  if (!isConfirmed) {
    noShowReason = ERROR_MESSAGES.ONLY_CONFIRMED_RESERVATIONS_NO_SHOW;
  } else if (res.checkIn > today) {
    noShowReason = ERROR_MESSAGES.NO_SHOW_ON_OR_AFTER_ARRIVAL;
  } else {
    noShowAllowed = true;
  }

  // 11. Resend Confirmation: reception, manager, owner.
  let resendAllowed = false;
  let resendReason: string | undefined;
  if (isPending && res.confirmationMode === 'manual_approval') {
    resendReason = ERROR_MESSAGES.CONFIRMATION_BLOCKED_APPROVAL;
  } else if (isExpired) {
    resendReason = ERROR_MESSAGES.CONFIRMATION_EXPIRED_HOLD;
  } else {
    resendAllowed = true;
  }

  // 12. Check In:
  let checkInAllowed = false;
  let checkInReason: string | undefined;
  if (isCheckedIn) {
    checkInReason = ERROR_MESSAGES.GUEST_ALREADY_CHECKED_IN;
  } else if (isCheckedOut || isCancelled || isExpired || isNoShow) {
    checkInReason = ERROR_MESSAGES.RESERVATION_COMPLETED_OR_CANCELLED;
  } else if (
    !isConfirmed &&
    !(isPending && res.confirmationMode === 'manual_approval')
  ) {
    checkInReason = ERROR_MESSAGES.CHECKIN_REQUIRES_CONFIRMATION;
  } else if (res.checkIn > today) {
    checkInReason = ERROR_MESSAGES.CHECKIN_ON_OR_AFTER_ARRIVAL;
  } else {
    checkInAllowed = true;
  }

  // 13. Check Out:
  let checkOutAllowed = false;
  let checkOutReason: string | undefined;
  if (!isCheckedIn) {
    checkOutReason = ERROR_MESSAGES.CHECKOUT_REQUIRES_CHECKIN;
  } else {
    checkOutAllowed = true;
  }

  return {
    edit_details: {
      allowed: editDetailsAllowed,
      reason: editDetailsAllowed
        ? undefined
        : ERROR_MESSAGES.CANNOT_EDIT_INACTIVE_BOOKING,
    },
    reassign_room: {
      allowed: reassignRoomAllowed,
      reason: reassignRoomAllowed
        ? undefined
        : ERROR_MESSAGES.ROOM_REASSIGN_INACTIVE,
    },
    change_dates: { allowed: changeDatesAllowed, reason: changeDatesReason },
    cancel: { allowed: cancelAllowed, reason: cancelReason },
    record_payment: {
      allowed: recordPaymentAllowed,
      reason: recordPaymentReason,
    },
    refund: { allowed: refundAllowed, reason: refundReason },
    verify_bank_transfer: {
      allowed: verifyTransferAllowed,
      reason: verifyTransferReason,
    },
    approve: { allowed: approveAllowed, reason: approveReason },
    decline: { allowed: declineAllowed, reason: declineReason },
    no_show: { allowed: noShowAllowed, reason: noShowReason },
    resend_confirmation: { allowed: resendAllowed, reason: resendReason },
    check_in: { allowed: checkInAllowed, reason: checkInReason },
    check_out: { allowed: checkOutAllowed, reason: checkOutReason },
  };
}

export async function getReservationAdminDetail(
  idOrRef: string,
  today: ISODate,
  permissions: {
    canViewGuestContact: boolean;
    canViewPayments: boolean;
  },
  now: Date = new Date(),
  userRole: AdminRole = 'manager',
): Promise<ReservationDetail | null> {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrRef,
    );

  const [resRow] = await db
    .select({
      res: reservations,
      roomNumber: rooms.roomNumber,
      roomStatus: rooms.status,
      roomTypeName: roomTypes.name,
      extraBedAvailable: roomTypes.extraBedAvailable,
    })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id))
    .where(
      isUUID
        ? eq(reservations.id, idOrRef)
        : eq(reservations.reference, idOrRef),
    )
    .limit(1);

  if (!resRow) return null;
  const { res, roomNumber, roomStatus, roomTypeName, extraBedAvailable } =
    resRow;

  // Parallel fetch relations
  const [
    nightsRaw,
    extrasRaw,
    historyRaw,
    paymentsRaw,
    notificationsRaw,
    auditRaw,
    settings,
    conflictingBlocks,
  ] = await Promise.all([
    db
      .select()
      .from(reservationNights)
      .where(eq(reservationNights.reservationId, res.id))
      .orderBy(reservationNights.date),

    db
      .select()
      .from(reservationExtras)
      .where(eq(reservationExtras.reservationId, res.id))
      .orderBy(reservationExtras.createdAt),

    db
      .select({
        id: reservationStatusHistory.id,
        fromStatus: reservationStatusHistory.fromStatus,
        toStatus: reservationStatusHistory.toStatus,
        reason: reservationStatusHistory.reason,
        changedBy: reservationStatusHistory.changedBy,
        createdAt: reservationStatusHistory.createdAt,
        staffFirstName: staffUsers.firstName,
        staffLastName: staffUsers.lastName,
        staffRole: staffUsers.role,
      })
      .from(reservationStatusHistory)
      .leftJoin(
        staffUsers,
        eq(reservationStatusHistory.changedBy, staffUsers.id),
      )
      .where(eq(reservationStatusHistory.reservationId, res.id))
      .orderBy(desc(reservationStatusHistory.createdAt)),

    permissions.canViewPayments
      ? db
          .select({
            payment: payments,
            proof: paymentProofs,
          })
          .from(payments)
          .leftJoin(paymentProofs, eq(paymentProofs.paymentId, payments.id))
          .where(eq(payments.reservationId, res.id))
          .orderBy(desc(payments.createdAt))
      : Promise.resolve([]),

    db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.reservationId, res.id))
      .orderBy(desc(notificationLogs.createdAt)),

    permissions.canViewPayments
      ? db
          .select({
            id: auditLogs.id,
            action: auditLogs.action,
            reason: auditLogs.reason,
            changes: auditLogs.changes,
            createdAt: auditLogs.createdAt,
            staffFirstName: staffUsers.firstName,
            staffLastName: staffUsers.lastName,
            actorRole: auditLogs.actorRole,
          })
          .from(auditLogs)
          .leftJoin(staffUsers, eq(auditLogs.actorId, staffUsers.id))
          .where(
            and(
              eq(auditLogs.entity, 'reservation'),
              eq(auditLogs.entityId, res.id),
            ),
          )
          .orderBy(desc(auditLogs.createdAt))
      : Promise.resolve([]),

    db.select().from(hotelSettings).where(eq(hotelSettings.id, 1)).limit(1),

    db
      .select({
        id: roomBlocks.id,
        reason: roomBlocks.reason,
      })
      .from(roomBlocks)
      .where(
        and(
          eq(roomBlocks.roomId, res.roomId),
          sql`daterange(${roomBlocks.startDate}, ${roomBlocks.endDate}, '[)') && daterange(${res.checkIn}::date, ${res.checkOut}::date, '[)')`,
        ),
      ),
  ]);

  const hotelSetting = settings[0];

  // Process Nights & Rate Rules
  const nightsList: ReservationNightItem[] = nightsRaw.map((n) => ({
    id: n.id,
    date: n.date,
    rateMinor: n.rateMinor,
    ruleName: null,
  }));

  // Process Extras
  const extrasList: ReservationExtraItem[] = extrasRaw.map((e) => ({
    id: e.id,
    name: e.name,
    quantity: e.quantity,
    unitPriceMinor: e.unitPriceMinor,
    totalMinor: e.totalMinor,
    pricingUnit: e.pricingUnit,
  }));

  // Process Status History
  const statusHistory: ReservationStatusHistoryItem[] = historyRaw.map((h) => {
    let actorName = 'System';
    if (h.staffFirstName || h.staffLastName) {
      actorName = `${h.staffFirstName ?? ''} ${h.staffLastName ?? ''}`.trim();
    } else if (!h.changedBy) {
      actorName = 'Guest';
    }

    return {
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      changedBy: h.changedBy,
      actorName,
      actorRole: h.staffRole ?? null,
      createdAt: h.createdAt.toISOString(),
    };
  });

  // Process Payments (Stripped if !canViewPayments)
  let paymentsList: ReservationPaymentItem[] | null = null;
  if (permissions.canViewPayments) {
    paymentsList = paymentsRaw.map(({ payment: p, proof }) => ({
      id: p.id,
      reference: p.reference,
      provider: p.provider,
      type: p.type,
      status: p.status,
      amountMinor: p.amountMinor,
      providerRef: p.providerRef,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      proofThumbnailUrl: proof
        ? `/api/admin/reservations/${res.id}/proof`
        : null,
      proofKey: proof?.storageKey ?? null,
      proofMimeType: proof?.mimeType ?? null,
    }));
  }

  // Process Notifications
  const notifications: ReservationNotificationLogItem[] = notificationsRaw.map(
    (nl) => ({
      id: nl.id,
      templateKey: nl.templateKey,
      channel: nl.channel,
      recipient: permissions.canViewGuestContact
        ? nl.recipient
        : nl.recipient.replace(/(?<=.{2}).(?=.*@)/g, '*'),
      subject: nl.subject,
      status: nl.status,
      error: nl.error,
      sentAt: nl.sentAt ? nl.sentAt.toISOString() : null,
      createdAt: nl.createdAt.toISOString(),
    }),
  );

  // Process Audit Logs
  let auditLogsList: ReservationAuditEntry[] | null = null;
  if (permissions.canViewPayments) {
    auditLogsList = auditRaw.map((a) => ({
      id: a.id,
      action: a.action,
      reason: a.reason,
      actorName:
        `${a.staffFirstName ?? ''} ${a.staffLastName ?? ''}`.trim() || 'System',
      actorRole: a.actorRole,
      changes: a.changes as Record<string, unknown> | null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  // Policy & Free Cancellation calculation
  const freeHours = hotelSetting?.freeCancellationHours ?? 48;
  const checkInDate = fromISO(res.checkIn);
  const freeCancellationUntilDate = new Date(
    checkInDate.getTime() - freeHours * 60 * 60 * 1000,
  );

  const policySnapshot: ReservationPolicySnapshot = {
    cancellationPolicyType: hotelSetting?.cancellationPolicyType ?? 'moderate',
    freeCancellationHours: freeHours,
    freeCancellationUntil: freeCancellationUntilDate.toISOString(),
    checkInTime: hotelSetting?.checkInTime ?? '14:00',
    checkOutTime: hotelSetting?.checkOutTime ?? '12:00',
    houseRules: hotelSetting?.houseRules ?? [],
  };

  // Alert Flags
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  const twoDaysLater = addDays(today, 2);

  const hasPendingProof = paymentsRaw.some(
    ({ payment: p }) =>
      p.provider === 'bank_transfer' && p.status === 'pending',
  );

  const alerts: ReservationAlertFlags = {
    bankTransferPendingVerification: hasPendingProof,
    awaitingHotelApproval:
      res.confirmationMode === 'manual_approval' && res.status === 'pending',
    holdExpiringSoon:
      res.status === 'pending' &&
      Boolean(res.holdExpiresAt) &&
      res.holdExpiresAt! > now &&
      res.holdExpiresAt! <= tenMinutesFromNow,
    holdExpired:
      res.status === 'pending' &&
      Boolean(res.holdExpiresAt) &&
      res.holdExpiresAt! <= now,
    balanceDueArrivingSoon:
      res.balanceMinor > 0 &&
      res.status !== 'cancelled' &&
      res.checkIn >= today &&
      res.checkIn <= twoDaysLater,
    roomBlockedOrMaintenance:
      roomStatus === 'maintenance' || conflictingBlocks.length > 0,
    roomBlockedReason:
      roomStatus === 'maintenance'
        ? 'Room is currently flagged in maintenance.'
        : conflictingBlocks[0]?.reason
          ? `Conflicting room block: ${conflictingBlocks[0].reason}`
          : undefined,
    failedNotification: notificationsRaw.some((n) => n.status === 'failed'),
  };

  const paymentState = computePaymentState(
    res.totalMinor,
    res.amountPaidMinor,
    res.amountRefundedMinor,
  );
  const balanceMinor = computeBalanceDue(
    res.totalMinor,
    res.amountPaidMinor,
    res.amountRefundedMinor,
    res.status,
  );

  return {
    id: res.id,
    reference: res.reference,
    guestName: res.guestName,
    guestEmail: permissions.canViewGuestContact ? res.guestEmail : null,
    guestPhone: permissions.canViewGuestContact ? res.guestPhone : null,
    guestCountry: res.guestCountry,
    specialRequests: res.specialRequests,
    notes: res.notes,
    roomTypeId: res.roomTypeId,
    roomTypeName,
    roomId: res.roomId,
    roomNumber,
    checkIn: res.checkIn,
    checkOut: res.checkOut,
    nights: res.nights,
    adults: res.adults,
    children: res.children,
    extraBedAvailable,
    arrivalTime: res.arrivalTime,
    status: res.status,
    bookingSource: res.bookingSource,
    channel: res.channel,
    paymentMode: res.paymentMode,
    confirmationMode: res.confirmationMode,
    subtotalMinor: res.subtotalMinor,
    extrasMinor: res.extrasMinor,
    discountMinor: res.discountMinor,
    taxMinor: res.taxMinor,
    serviceChargeMinor: res.serviceChargeMinor,
    totalMinor: res.totalMinor,
    depositRequiredMinor: res.depositRequiredMinor,
    amountPaidMinor: res.amountPaidMinor,
    amountRefundedMinor: res.amountRefundedMinor,
    balanceMinor,
    currency: res.currency,
    paymentState,
    holdExpiresAt: res.holdExpiresAt ? res.holdExpiresAt.toISOString() : null,
    confirmedAt: res.confirmedAt ? res.confirmedAt.toISOString() : null,
    checkedInAt: res.checkedInAt ? res.checkedInAt.toISOString() : null,
    checkedOutAt: res.checkedOutAt ? res.checkedOutAt.toISOString() : null,
    cancelledAt: res.cancelledAt ? res.cancelledAt.toISOString() : null,
    cancellationReason: res.cancellationReason,
    createdAt: res.createdAt.toISOString(),
    updatedAt: res.updatedAt.toISOString(),
    nightsList,
    extrasList,
    statusHistory,
    payments: paymentsList,
    notifications,
    auditLogs: auditLogsList,
    policySnapshot,
    alerts,
    allowedActions: computeAllowedActions(
      res,
      userRole,
      today,
      hasPendingProof,
      balanceMinor,
    ),
  };
}

export async function getReservationNeighbors(
  currentId: string,
  params: ReservationsListQueryParams,
  today: ISODate,
): Promise<ReservationNeighbors> {
  const where = buildWhereConditions(params, today);

  const sortMap = {
    check_in: reservations.checkIn,
    created_at: reservations.createdAt,
    total_minor: reservations.totalMinor,
    guest_name: reservations.guestName,
  };

  const selectedSort = sortMap[params.sort] ?? reservations.checkIn;
  const orderDirection =
    params.order === 'desc' ? desc(selectedSort) : selectedSort;

  const query = db
    .select({ id: reservations.id })
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id));

  if (where) query.where(where);

  // Fetch up to 500 IDs in active sequence
  const allIds = await query.orderBy(orderDirection).limit(500);
  const idx = allIds.findIndex((r) => r.id === currentId);

  if (idx === -1) {
    return { prevId: null, nextId: null };
  }

  return {
    prevId: idx > 0 ? allIds[idx - 1].id : null,
    nextId: idx < allIds.length - 1 ? allIds[idx + 1].id : null,
  };
}

export async function logProofViewAudit(
  reservationId: string,
  staffUserId: string,
  paymentId?: string,
) {
  await db.insert(auditLogs).values({
    actorId: staffUserId,
    entity: 'reservation_payment_proof',
    entityId: paymentId ?? reservationId,
    action: 'view_proof',
    reason: 'Staff inspected bank transfer proof in lightbox',
    changes: { reservationId, paymentId },
  });
}

export async function logExportAudit(
  staffUserId: string,
  rowCount: number,
  filters: Record<string, unknown>,
) {
  await db.insert(auditLogs).values({
    actorId: staffUserId,
    entity: 'reservations',
    entityId: 'export_csv',
    action: 'export',
    reason: `Exported ${rowCount} reservations to CSV`,
    changes: { rowCount, filters },
  });
}

function verifyVersion(updatedAt: Date, expectedVersion: string) {
  const currentIso = updatedAt.toISOString();
  if (
    currentIso !== expectedVersion &&
    Math.abs(
      new Date(currentIso).getTime() - new Date(expectedVersion).getTime(),
    ) > 1000
  ) {
    throw new Error(ERROR_MESSAGES.RESERVATION_VERSION_CONFLICT);
  }
}

export async function listAvailableRoomsForStay(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string,
) {
  const result = await db.execute(sql`
    SELECT r.id, r.room_number as "roomNumber", r.floor
    FROM rooms r
    WHERE r.room_type_id = ${roomTypeId}
      AND r.status = 'active'
      AND r.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM reservations x
        WHERE x.room_id = r.id
          ${excludeReservationId ? sql`AND x.id != ${excludeReservationId}` : sql``}
          AND x.status IN ('pending', 'confirmed', 'checked_in')
          AND daterange(x.check_in, x.check_out, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')
      )
      AND NOT EXISTS (
        SELECT 1 FROM room_blocks b
        WHERE b.room_id = r.id
          AND daterange(b.start_date, b.end_date, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')
      )
    ORDER BY r.room_number
  `);

  return (
    (result.rows as unknown as {
      id: string;
      roomNumber: string;
      floor: number | null;
    }[]) ?? []
  );
}

export async function updateReservationDetails(
  id: string,
  version: string,
  data: AdminEditDetailsInput,
  staffId: string,
  staffRole: AdminRole,
) {
  const [res] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);
  verifyVersion(res.updatedAt, version);

  if (res.status === 'cancelled' || res.status === 'expired') {
    throw new Error(ERROR_MESSAGES.CANNOT_EDIT_INACTIVE_BOOKING);
  }

  const emailChanged = data.email && data.email !== res.guestEmail;

  const [updated] = await db
    .update(reservations)
    .set({
      guestName: data.fullName,
      guestEmail: data.email || null,
      guestEmailMissing: !data.email,
      guestPhone: data.phone,
      guestCountry: data.country || res.guestCountry,
      arrivalTime: data.arrivalTime ?? res.arrivalTime,
      specialRequests: data.specialRequests ?? res.specialRequests,
      notes: data.internalNotes ?? res.notes,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, id))
    .returning();

  await db.insert(auditLogs).values({
    actorId: staffId,
    actorRole: staffRole,
    entity: 'reservation',
    entityId: id,
    action: 'edit_details',
    reason: 'Updated guest details and notes',
    changes: {
      before: {
        guestName: res.guestName,
        guestEmail: res.guestEmail,
        guestPhone: res.guestPhone,
        notes: res.notes,
      },
      after: {
        guestName: data.fullName,
        guestEmail: data.email,
        guestPhone: data.phone,
        notes: data.internalNotes,
      },
    },
  });

  if (emailChanged && data.email) {
    await db.insert(notificationLogs).values({
      reservationId: id,
      templateKey: 'booking_confirmation',
      channel: 'email',
      recipient: data.email,
      subject: `Your Booking at Divine Excellent Home (${res.reference})`,
      status: 'queued',
      dedupeKey: `${res.reference}:email_update:${Date.now()}`,
    });
  }

  return updated;
}

export async function reassignReservationRoom(
  id: string,
  version: string,
  newRoomId: string,
  note: string | undefined,
  staffId: string,
  staffRole: AdminRole,
) {
  return await db.transaction(async (tx) => {
    const [res] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);
    verifyVersion(res.updatedAt, version);

    if (!['pending', 'confirmed', 'checked_in'].includes(res.status)) {
      throw new Error(ERROR_MESSAGES.ROOM_REASSIGN_INACTIVE);
    }

    const [targetRoom] = await tx
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, newRoomId), eq(rooms.isActive, true)))
      .limit(1);

    if (!targetRoom) throw new Error(ERROR_MESSAGES.ROOM_REASSIGN_NOT_FOUND);
    if (targetRoom.roomTypeId !== res.roomTypeId) {
      throw new Error(ERROR_MESSAGES.ROOM_REASSIGN_TYPE_MISMATCH);
    }

    // Check conflict
    const conflictRes = await tx.execute(sql`
      SELECT x.reference FROM reservations x
      WHERE x.room_id = ${newRoomId}
        AND x.id != ${id}
        AND x.status IN ('pending', 'confirmed', 'checked_in')
        AND daterange(x.check_in, x.check_out, '[)') && daterange(${res.checkIn}::date, ${res.checkOut}::date, '[)')
      LIMIT 1
    `);

    if (conflictRes.rows?.length) {
      throw new Error(ERROR_MESSAGES.ROOM_ALREADY_RESERVED);
    }

    const conflictBlock = await tx.execute(sql`
      SELECT b.id FROM room_blocks b
      WHERE b.room_id = ${newRoomId}
        AND daterange(b.start_date, b.end_date, '[)') && daterange(${res.checkIn}::date, ${res.checkOut}::date, '[)')
      LIMIT 1
    `);

    if (conflictBlock.rows?.length) {
      throw new Error(ERROR_MESSAGES.ROOM_BLOCKED_FOR_DATES);
    }

    const [updated] = await tx
      .update(reservations)
      .set({
        roomId: newRoomId,
        notes: note
          ? res.notes
            ? `${res.notes}\nRoom reassign note: ${note}`
            : `Room reassign note: ${note}`
          : res.notes,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    await tx.insert(auditLogs).values({
      actorId: staffId,
      actorRole: staffRole,
      entity: 'reservation',
      entityId: id,
      action: 'reassign_room',
      reason: note || 'Reassigned to another room of same type',
      changes: {
        fromRoomId: res.roomId,
        toRoomId: newRoomId,
      },
    });

    return updated;
  });
}

export async function recordAdminPayment(
  id: string,
  version: string,
  data: AdminRecordPaymentInput,
  staffId: string,
  staffRole: AdminRole,
) {
  return await db.transaction(async (tx) => {
    const [res] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);
    verifyVersion(res.updatedAt, version);

    if (res.status === 'cancelled' || res.status === 'expired') {
      throw new Error(ERROR_MESSAGES.CANNOT_RECORD_PAYMENT_CANCELLED);
    }

    const balanceMinor = Math.max(
      0,
      res.totalMinor - (res.amountPaidMinor - res.amountRefundedMinor),
    );
    if (balanceMinor <= 0 && res.status !== 'pending') {
      throw new Error(ERROR_MESSAGES.RESERVATION_FULLY_PAID);
    }

    if (data.amountMinor > balanceMinor + 100) {
      throw new Error(
        ERROR_MESSAGES.PAYMENT_EXCEEDS_BALANCE(
          (data.amountMinor / 100).toLocaleString(),
          (balanceMinor / 100).toLocaleString(),
        ),
      );
    }

    const paymentId = crypto.randomUUID();
    const providerEnum =
      data.method === 'cash'
        ? 'cash'
        : data.method === 'bank_transfer'
          ? 'bank_transfer'
          : 'paystack';

    await tx.insert(payments).values({
      id: paymentId,
      reservationId: id,
      reference: data.reference,
      provider: providerEnum,
      type: data.type,
      status: 'paid',
      amountMinor: data.amountMinor,
      currency: 'NGN',
      channel: data.method,
      reconciled: true,
      reconciledAt: new Date(),
      reconciledBy: staffId,
      note: data.note,
      paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
    });

    const newPaidMinor = res.amountPaidMinor + data.amountMinor;
    const shouldConfirm =
      res.status === 'pending' &&
      (newPaidMinor >= res.depositRequiredMinor ||
        newPaidMinor >= res.totalMinor);

    const [updated] = await tx
      .update(reservations)
      .set({
        amountPaidMinor: newPaidMinor,
        status: shouldConfirm ? 'confirmed' : res.status,
        confirmedAt: shouldConfirm ? new Date() : res.confirmedAt,
        confirmedBy: shouldConfirm ? staffId : res.confirmedBy,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    if (shouldConfirm) {
      await tx.insert(reservationStatusHistory).values({
        reservationId: id,
        fromStatus: 'pending',
        toStatus: 'confirmed',
        reason: 'Payment received meeting booking requirement',
        changedBy: staffId,
      });

      if (res.guestEmail) {
        await tx.insert(notificationLogs).values({
          reservationId: id,
          templateKey: 'booking_confirmation',
          channel: 'email',
          recipient: res.guestEmail,
          subject: `Booking Confirmed: ${res.reference}`,
          status: 'queued',
          dedupeKey: `${res.reference}:payment_confirmed:${Date.now()}`,
        });
      }
    }

    await tx.insert(auditLogs).values({
      actorId: staffId,
      actorRole: staffRole,
      entity: 'reservation_payment',
      entityId: paymentId,
      action: 'record_payment',
      reason:
        data.note ||
        `Recorded payment of ₦${(data.amountMinor / 100).toLocaleString()}`,
      changes: {
        amountMinor: data.amountMinor,
        method: data.method,
        reference: data.reference,
        newPaidMinor,
      },
    });

    return updated;
  });
}

export async function verifyBankTransfer(
  id: string,
  paymentId: string,
  action: 'verify' | 'reject',
  verifiedAmountMinor: number | undefined,
  reason: string | undefined,
  note: string | undefined,
  staffId: string,
  staffRole: AdminRole,
) {
  return await db.transaction(async (tx) => {
    const [pay] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.reservationId, id)))
      .limit(1);

    if (!pay) throw new Error(ERROR_MESSAGES.PAYMENT_RECORD_NOT_FOUND);
    if (pay.status !== 'pending') {
      throw new Error(ERROR_MESSAGES.ONLY_PENDING_BANK_TRANSFERS);
    }

    const [res] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);
    if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);

    if (action === 'verify') {
      const verifiedMinor = verifiedAmountMinor ?? pay.amountMinor;

      await tx
        .update(payments)
        .set({
          status: 'paid',
          amountMinor: verifiedMinor,
          paidAt: new Date(),
          reconciled: true,
          reconciledAt: new Date(),
          reconciledBy: staffId,
          note: note ?? pay.note,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));

      const newPaidMinor = res.amountPaidMinor + verifiedMinor;
      const shouldConfirm =
        res.status === 'pending' &&
        (newPaidMinor >= res.depositRequiredMinor ||
          newPaidMinor >= res.totalMinor);

      const [updated] = await tx
        .update(reservations)
        .set({
          amountPaidMinor: newPaidMinor,
          status: shouldConfirm ? 'confirmed' : res.status,
          confirmedAt: shouldConfirm ? new Date() : res.confirmedAt,
          confirmedBy: shouldConfirm ? staffId : res.confirmedBy,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, id))
        .returning();

      if (shouldConfirm) {
        await tx.insert(reservationStatusHistory).values({
          reservationId: id,
          fromStatus: 'pending',
          toStatus: 'confirmed',
          reason: 'Bank transfer verified by staff',
          changedBy: staffId,
        });

        if (res.guestEmail) {
          await tx.insert(notificationLogs).values({
            reservationId: id,
            templateKey: 'booking_confirmation',
            channel: 'email',
            recipient: res.guestEmail,
            subject: `Bank Transfer Verified - Booking Confirmed (${res.reference})`,
            status: 'queued',
            dedupeKey: `${res.reference}:transfer_verified:${Date.now()}`,
          });
        }
      }

      await tx.insert(auditLogs).values({
        actorId: staffId,
        actorRole: staffRole,
        entity: 'reservation_payment',
        entityId: paymentId,
        action: 'verify_transfer',
        reason: note || 'Verified bank transfer payment',
        changes: { verifiedMinor },
      });

      return updated;
    } else {
      // Reject
      if (!reason || reason.trim().length < 3) {
        throw new Error(ERROR_MESSAGES.REJECTION_REASON_REQUIRED);
      }

      await tx
        .update(payments)
        .set({
          status: 'failed',
          note: `Rejected by staff: ${reason}`,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));

      if (res.guestEmail) {
        await tx.insert(notificationLogs).values({
          reservationId: id,
          templateKey: 'transfer_rejected',
          channel: 'email',
          recipient: res.guestEmail,
          subject: `Payment Verification Issue - ${res.reference}`,
          status: 'queued',
          dedupeKey: `${res.reference}:transfer_rejected:${Date.now()}`,
        });
      }

      await tx.insert(auditLogs).values({
        actorId: staffId,
        actorRole: staffRole,
        entity: 'reservation_payment',
        entityId: paymentId,
        action: 'reject_transfer',
        reason,
        changes: { status: 'failed', rejectionReason: reason },
      });

      return res;
    }
  });
}

export async function approveOrDeclineBooking(
  id: string,
  version: string,
  action: 'approve' | 'decline',
  reason: string | undefined,
  staffId: string,
  staffRole: AdminRole,
) {
  return await db.transaction(async (tx) => {
    const [res] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);
    verifyVersion(res.updatedAt, version);

    if (
      res.status !== 'pending' ||
      res.confirmationMode !== 'manual_approval'
    ) {
      throw new Error(ERROR_MESSAGES.ONLY_PENDING_APPROVAL);
    }

    if (action === 'approve') {
      const [updated] = await tx
        .update(reservations)
        .set({
          status: 'confirmed',
          confirmedAt: new Date(),
          confirmedBy: staffId,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, id))
        .returning();

      await tx.insert(reservationStatusHistory).values({
        reservationId: id,
        fromStatus: 'pending',
        toStatus: 'confirmed',
        reason: reason || 'Booking approved by hotel staff',
        changedBy: staffId,
      });

      await tx.insert(auditLogs).values({
        actorId: staffId,
        actorRole: staffRole,
        entity: 'reservation',
        entityId: id,
        action: 'approve_booking',
        reason: reason || 'Approved reservation in manual confirmation mode',
      });

      if (res.guestEmail) {
        await tx.insert(notificationLogs).values({
          reservationId: id,
          templateKey: 'booking_approved',
          channel: 'email',
          recipient: res.guestEmail,
          subject: `Your Booking at Divine Excellent Home is Approved (${res.reference})`,
          status: 'queued',
          dedupeKey: `${res.reference}:approved:${Date.now()}`,
        });
      }

      return updated;
    } else {
      if (!reason || reason.trim().length < 3) {
        throw new Error(ERROR_MESSAGES.DECLINE_REASON_REQUIRED);
      }

      const [updated] = await tx
        .update(reservations)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: `Declined: ${reason}`,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, id))
        .returning();

      await tx.insert(reservationStatusHistory).values({
        reservationId: id,
        fromStatus: 'pending',
        toStatus: 'cancelled',
        reason: `Booking declined: ${reason}`,
        changedBy: staffId,
      });

      await tx.insert(auditLogs).values({
        actorId: staffId,
        actorRole: staffRole,
        entity: 'reservation',
        entityId: id,
        action: 'decline_booking',
        reason,
      });

      if (res.guestEmail) {
        await tx.insert(notificationLogs).values({
          reservationId: id,
          templateKey: 'booking_declined',
          channel: 'email',
          recipient: res.guestEmail,
          subject: `Reservation Update: ${res.reference}`,
          status: 'queued',
          dedupeKey: `${res.reference}:declined:${Date.now()}`,
        });
      }

      return updated;
    }
  });
}

export async function changeReservationDates(
  id: string,
  version: string,
  data: AdminChangeDatesInput,
  staffId: string,
  staffRole: AdminRole,
) {
  return await db.transaction(async (tx) => {
    const [res] = await tx
      .select({
        res: reservations,
        roomSlug: roomTypes.slug,
      })
      .from(reservations)
      .innerJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id))
      .where(eq(reservations.id, id))
      .limit(1);

    if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);
    verifyVersion(res.res.updatedAt, version);

    if (!['pending', 'confirmed'].includes(res.res.status)) {
      throw new Error(ERROR_MESSAGES.CANNOT_CHANGE_DATES_STATUS);
    }

    const targetRoomId = data.roomId ?? res.res.roomId;

    // Check availability
    const conflictRes = await tx.execute(sql`
      SELECT x.reference FROM reservations x
      WHERE x.room_id = ${targetRoomId}
        AND x.id != ${id}
        AND x.status IN ('pending', 'confirmed', 'checked_in')
        AND daterange(x.check_in, x.check_out, '[)') && daterange(${data.checkIn}::date, ${data.checkOut}::date, '[)')
      LIMIT 1
    `);

    if (conflictRes.rows?.length) {
      throw new Error(ERROR_MESSAGES.ROOM_NOT_AVAILABLE_NEW_DATES);
    }

    // Call server quote helper
    const quote = await buildCheckoutQuote({
      room: res.roomSlug,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: res.res.adults,
      children: res.res.children,
      extraBed: false,
      extras: [],
    });

    if (quote.status !== 'ok') {
      throw new Error(ERROR_MESSAGES.QUOTE_NEW_STAY_FAILED(quote.status));
    }

    const b = quote.breakdown;
    const newNights = nightsBetween(data.checkIn, data.checkOut);

    // Delete old nights and insert new
    await tx
      .delete(reservationNights)
      .where(eq(reservationNights.reservationId, id));

    for (const line of b.lines) {
      await tx.insert(reservationNights).values({
        reservationId: id,
        date: line.date,
        rateMinor: line.rateMinor,
      });
    }

    const [updated] = await tx
      .update(reservations)
      .set({
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        nights: newNights,
        roomId: targetRoomId,
        subtotalMinor: b.roomSubtotalMinor,
        serviceChargeMinor: b.serviceChargeMinor,
        taxMinor: b.taxMinor,
        totalMinor: b.totalMinor,
        changeCount: res.res.changeCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    await tx.insert(auditLogs).values({
      actorId: staffId,
      actorRole: staffRole,
      entity: 'reservation',
      entityId: id,
      action: 'change_dates',
      reason: data.overrideReason || 'Stay dates changed by staff',
      changes: {
        fromDates: `${res.res.checkIn} to ${res.res.checkOut}`,
        toDates: `${data.checkIn} to ${data.checkOut}`,
        fromTotalMinor: res.res.totalMinor,
        toTotalMinor: b.totalMinor,
        overrideRules: data.overrideRules,
      },
    });

    if (res.res.guestEmail) {
      await tx.insert(notificationLogs).values({
        reservationId: id,
        templateKey: 'dates_changed',
        channel: 'email',
        recipient: res.res.guestEmail,
        subject: `Your Booking Dates Have Changed: ${res.res.reference}`,
        status: 'queued',
        dedupeKey: `${res.res.reference}:dates_changed:${Date.now()}`,
      });
    }

    return updated;
  });
}

export async function cancelReservationAdmin(
  id: string,
  version: string,
  data: AdminCancelInput,
  staffId: string,
  staffRole: AdminRole,
) {
  return await db.transaction(async (tx) => {
    const [res] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);
    verifyVersion(res.updatedAt, version);

    if (res.status === 'checked_in') {
      throw new Error(ERROR_MESSAGES.CANNOT_CANCEL_CHECKED_IN);
    }

    if (!['pending', 'confirmed'].includes(res.status)) {
      throw new Error(ERROR_MESSAGES.ONLY_PENDING_CONFIRMED_CANCEL);
    }

    const netPaid = Math.max(0, res.amountPaidMinor - res.amountRefundedMinor);
    if (data.refundAmountMinor > netPaid) {
      throw new Error(
        ERROR_MESSAGES.REFUND_AMOUNT_EXCEEDS_REFUNDABLE(
          (data.refundAmountMinor / 100).toLocaleString(),
          (netPaid / 100).toLocaleString(),
        ),
      );
    }

    if (data.refundAmountMinor > 0) {
      const refundRef = createReference();
      await tx.insert(payments).values({
        reservationId: id,
        reference: refundRef,
        provider: 'cash',
        type: 'refund',
        status: 'paid',
        amountMinor: data.refundAmountMinor,
        currency: 'NGN',
        note: `Cancellation refund: ${data.reason}`,
        reconciled: true,
        reconciledAt: new Date(),
        reconciledBy: staffId,
        paidAt: new Date(),
      });
    }

    const [updated] = await tx
      .update(reservations)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: data.reason,
        amountRefundedMinor: res.amountRefundedMinor + data.refundAmountMinor,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    await tx.insert(reservationStatusHistory).values({
      reservationId: id,
      fromStatus: res.status,
      toStatus: 'cancelled',
      reason: data.reason,
      changedBy: staffId,
    });

    await tx.insert(auditLogs).values({
      actorId: staffId,
      actorRole: staffRole,
      entity: 'reservation',
      entityId: id,
      action: 'cancel',
      reason: data.reason,
      changes: {
        refundAmountMinor: data.refundAmountMinor,
        overrideReason: data.overrideReason,
        doNotEmailGuest: data.doNotEmailGuest,
      },
    });

    if (!data.doNotEmailGuest && res.guestEmail) {
      await tx.insert(notificationLogs).values({
        reservationId: id,
        templateKey: 'booking_cancelled',
        channel: 'email',
        recipient: res.guestEmail,
        subject: `Booking Cancelled: ${res.reference}`,
        status: 'queued',
        dedupeKey: `${res.reference}:cancelled:${Date.now()}`,
      });
    }

    return updated;
  });
}

export async function issueRefundAdmin(
  id: string,
  version: string,
  data: AdminRefundInput,
  staffId: string,
  staffRole: AdminRole,
) {
  return await db.transaction(async (tx) => {
    const [res] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);
    verifyVersion(res.updatedAt, version);

    const [targetPayment] = await tx
      .select()
      .from(payments)
      .where(
        and(eq(payments.id, data.paymentId), eq(payments.reservationId, id)),
      )
      .limit(1);

    if (!targetPayment)
      throw new Error(ERROR_MESSAGES.TARGET_PAYMENT_NOT_FOUND);
    if (targetPayment.status !== 'paid') {
      throw new Error(ERROR_MESSAGES.REFUND_ONLY_PAID_PAYMENTS);
    }

    const [priorRefunds] = await tx
      .select({
        total: sql<number>`COALESCE(SUM(amount_minor), 0)`,
      })
      .from(payments)
      .where(eq(payments.refundOfPaymentId, data.paymentId));

    const priorRefundedMinor = Number(priorRefunds?.total ?? 0);
    const availableForRefund = Math.max(
      0,
      targetPayment.amountMinor - priorRefundedMinor,
    );

    if (data.amountMinor > availableForRefund) {
      throw new Error(
        ERROR_MESSAGES.REFUND_EXCEEDS_AVAILABLE_BALANCE(
          (data.amountMinor / 100).toLocaleString(),
          (availableForRefund / 100).toLocaleString(),
        ),
      );
    }

    const refundPaymentId = crypto.randomUUID();
    const refundRef = data.reference || createReference();
    const isManual = data.method.startsWith('manual');
    const refundProvider = isManual
      ? data.method === 'manual_bank'
        ? 'bank_transfer'
        : 'cash'
      : targetPayment.provider;

    await tx.insert(payments).values({
      id: refundPaymentId,
      reservationId: id,
      refundOfPaymentId: data.paymentId,
      reference: refundRef,
      provider: refundProvider,
      type: 'refund',
      status: isManual ? 'paid' : 'pending',
      amountMinor: data.amountMinor,
      currency: 'NGN',
      channel: data.method,
      note: data.reason,
      reconciled: isManual,
      reconciledAt: isManual ? new Date() : null,
      reconciledBy: isManual ? staffId : null,
      paidAt: isManual ? new Date() : null,
    });

    const [updated] = await tx
      .update(reservations)
      .set({
        amountRefundedMinor: res.amountRefundedMinor + data.amountMinor,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    await tx.insert(auditLogs).values({
      actorId: staffId,
      actorRole: staffRole,
      entity: 'reservation_payment',
      entityId: refundPaymentId,
      action: 'issue_refund',
      reason: data.reason,
      changes: {
        originalPaymentId: data.paymentId,
        amountMinor: data.amountMinor,
        method: data.method,
      },
    });

    return updated;
  });
}

export async function markReservationNoShow(
  id: string,
  version: string,
  data: AdminNoShowInput,
  staffId: string,
  staffRole: AdminRole,
  today: ISODate,
) {
  return await db.transaction(async (tx) => {
    const [res] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);
    verifyVersion(res.updatedAt, version);

    if (res.status !== 'confirmed') {
      throw new Error(ERROR_MESSAGES.ONLY_CONFIRMED_NO_SHOW);
    }

    if (res.checkIn > today) {
      throw new Error(ERROR_MESSAGES.NO_SHOW_TOO_EARLY);
    }

    const refundAmount = data.refundAmountMinor || 0;
    if (refundAmount > 0) {
      const netPaid = Math.max(
        0,
        res.amountPaidMinor - res.amountRefundedMinor,
      );
      if (refundAmount > netPaid) {
        throw new Error(ERROR_MESSAGES.REFUND_EXCEEDS_BALANCE);
      }

      await tx.insert(payments).values({
        reservationId: id,
        reference: createReference(),
        provider: 'cash',
        type: 'refund',
        status: 'paid',
        amountMinor: refundAmount,
        currency: 'NGN',
        note: `No-show refund: ${data.reason || 'Staff override'}`,
        reconciled: true,
        reconciledAt: new Date(),
        reconciledBy: staffId,
        paidAt: new Date(),
      });
    }

    const [updated] = await tx
      .update(reservations)
      .set({
        status: 'no_show',
        amountRefundedMinor: res.amountRefundedMinor + refundAmount,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    await tx.insert(reservationStatusHistory).values({
      reservationId: id,
      fromStatus: 'confirmed',
      toStatus: 'no_show',
      reason: data.reason || 'Guest did not arrive for scheduled stay',
      changedBy: staffId,
    });

    await tx.insert(auditLogs).values({
      actorId: staffId,
      actorRole: staffRole,
      entity: 'reservation',
      entityId: id,
      action: 'mark_no_show',
      reason: data.reason || 'Marked as no-show',
      changes: {
        refundAmountMinor: refundAmount,
        overrideReason: data.overrideReason,
      },
    });

    return updated;
  });
}

export async function resendReservationConfirmation(
  id: string,
  templateKey: string,
  recipient: string,
  staffId: string,
  staffRole: AdminRole,
) {
  const [res] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!res) throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);

  await db.insert(notificationLogs).values({
    reservationId: id,
    templateKey,
    channel: 'email',
    recipient,
    subject: `Divine Excellent Home - Reference ${res.reference}`,
    status: 'queued',
    dedupeKey: `${res.reference}:resend_${templateKey}:${Date.now()}`,
  });

  await db.insert(auditLogs).values({
    actorId: staffId,
    actorRole: staffRole,
    entity: 'reservation',
    entityId: id,
    action: 'resend_confirmation',
    reason: `Resent ${templateKey} to ${recipient}`,
    changes: { templateKey, recipient },
  });

  return { success: true };
}

export async function adminCreateReservation(
  input: AdminCreateReservationInput,
  staffId: string,
  staffRole: AdminRole,
) {
  return await db.transaction(async (tx) => {
    // 1. Verify Room Type
    const [rt] = await tx
      .select()
      .from(roomTypes)
      .where(
        and(eq(roomTypes.id, input.roomTypeId), eq(roomTypes.isActive, true)),
      )
      .limit(1);

    if (!rt) throw new Error(ERROR_MESSAGES.ROOM_TYPE_INACTIVE);

    // 2. Select Room
    let assignedRoomId = input.roomId;
    if (!assignedRoomId) {
      const available = await findAvailableRoom(
        rt.id,
        input.checkIn,
        input.checkOut,
      );
      if (!available) {
        throw new Error(ERROR_MESSAGES.NO_ROOMS_SELECTED_DATES);
      }
      assignedRoomId = available.id;
    } else {
      const conflictRes = await tx.execute(sql`
        SELECT 1 FROM reservations x
        WHERE x.room_id = ${assignedRoomId}
          AND x.status IN ('pending', 'confirmed', 'checked_in')
          AND daterange(x.check_in, x.check_out, '[)') && daterange(${input.checkIn}::date, ${input.checkOut}::date, '[)')
        LIMIT 1
      `);
      if (conflictRes.rows?.length) {
        throw new Error(ERROR_MESSAGES.SELECTED_ROOM_NOT_AVAILABLE);
      }
    }

    // 3. Compute Quote
    const quote = await buildCheckoutQuote({
      room: rt.slug,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
      children: input.children,
      extraBed: input.extraBed,
      extras: input.extras,
    });

    if (quote.status !== 'ok') {
      throw new Error(
        ERROR_MESSAGES.PRICING_QUOTE_CALCULATION_FAILED(quote.status),
      );
    }

    const subtotalMinor = quote.breakdown.roomSubtotalMinor;
    const serviceChargeMinor = quote.breakdown.serviceChargeMinor;
    const taxMinor = quote.breakdown.taxMinor;
    let totalMinor = quote.breakdown.totalMinor;

    // Apply Staff Discount if allowed
    let discountMinor = 0;
    if (input.discount) {
      if (staffRole === 'reception') {
        throw new Error(ERROR_MESSAGES.RECEPTION_CANNOT_DISCOUNT);
      }
      if (input.discount.type === 'percentage') {
        discountMinor = Math.round((totalMinor * input.discount.value) / 100);
      } else {
        discountMinor = Math.round(input.discount.value * 100);
      }
      totalMinor = Math.max(0, totalMinor - discountMinor);
    }

    const reference = createReference();
    const nights = nightsBetween(input.checkIn, input.checkOut);
    const reservationId = crypto.randomUUID();

    let initialStatus: 'pending' | 'confirmed' = 'pending';
    let holdExpiresAt: Date | null = null;
    let initialPaidMinor = 0;

    if (input.paymentChoice.mode === 'hold') {
      initialStatus = 'pending';
      holdExpiresAt = new Date(
        Date.now() + input.paymentChoice.holdHours * 3600_000,
      );
    } else if (input.paymentChoice.mode === 'record_payment') {
      initialStatus = 'confirmed';
      initialPaidMinor = input.paymentChoice.amountMinor;
    } else if (input.paymentChoice.mode === 'pay_at_hotel') {
      initialStatus = 'confirmed';
    }

    // 4. Insert Reservation
    const [res] = await tx
      .insert(reservations)
      .values({
        id: reservationId,
        reference,
        roomId: assignedRoomId,
        roomTypeId: rt.id,
        guestName: input.guest.fullName,
        guestEmail: input.noEmail ? null : input.guest.email || null,
        guestEmailMissing: input.noEmail,
        guestPhone: input.guest.phone,
        guestCountry: input.guest.country || 'NG',
        arrivalTime: input.guest.arrivalTime,
        specialRequests: input.guest.specialRequests,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        adults: input.adults,
        children: input.children,
        nights,
        status: initialStatus,
        bookingSource: input.source,
        paymentMode:
          input.paymentChoice.mode === 'pay_at_hotel'
            ? 'pay_at_hotel'
            : 'full_online',
        confirmationMode: 'instant',
        subtotalMinor,
        discountMinor,
        serviceChargeMinor,
        taxMinor,
        totalMinor,
        depositRequiredMinor: Math.round(totalMinor * 0.3),
        amountPaidMinor: initialPaidMinor,
        currency: 'NGN',
        holdExpiresAt,
        staffTermsAccepted: true,
        confirmedAt: initialStatus === 'confirmed' ? new Date() : null,
        confirmedBy: initialStatus === 'confirmed' ? staffId : null,
        notes: input.internalNotes,
      })
      .returning();

    // 5. Insert Nights
    for (const line of quote.breakdown.lines) {
      await tx.insert(reservationNights).values({
        reservationId,
        date: line.date,
        rateMinor: line.rateMinor,
      });
    }

    // 6. Insert Extras
    for (const extra of quote.breakdown.extras) {
      await tx.insert(reservationExtras).values({
        reservationId,
        name: extra.name,
        quantity: extra.quantity,
        unitPriceMinor: extra.totalMinor / Math.max(1, extra.quantity),
        totalMinor: extra.totalMinor,
      });
    }

    // 7. Insert Payment if recorded
    if (input.paymentChoice.mode === 'record_payment') {
      const pChoice = input.paymentChoice;
      await tx.insert(payments).values({
        reservationId,
        reference: pChoice.reference,
        provider:
          pChoice.method === 'cash'
            ? 'cash'
            : pChoice.method === 'bank_transfer'
              ? 'bank_transfer'
              : 'paystack',
        type: 'full',
        status: 'paid',
        amountMinor: pChoice.amountMinor,
        currency: 'NGN',
        channel: pChoice.method,
        note: pChoice.note,
        reconciled: true,
        reconciledAt: new Date(),
        reconciledBy: staffId,
        paidAt: new Date(),
      });
    }

    // 8. History & Audit
    await tx.insert(reservationStatusHistory).values({
      reservationId,
      fromStatus: null,
      toStatus: initialStatus,
      reason: `Manual reservation created by staff via ${input.source}`,
      changedBy: staffId,
    });

    await tx.insert(auditLogs).values({
      actorId: staffId,
      actorRole: staffRole,
      entity: 'reservation',
      entityId: reservationId,
      action: 'create_manual',
      reason: `Created reservation ${reference}`,
      changes: {
        source: input.source,
        paymentChoice: input.paymentChoice.mode,
        discount: input.discount,
      },
    });

    // 9. Queue Email
    if (!input.noEmail && input.guest.email) {
      await tx.insert(notificationLogs).values({
        reservationId,
        templateKey: 'booking_confirmation',
        channel: 'email',
        recipient: input.guest.email,
        subject: `Your Booking at Divine Excellent Home (${reference})`,
        status: 'queued',
        dedupeKey: `${reference}:created:${Date.now()}`,
      });
    }

    return res;
  });
}
