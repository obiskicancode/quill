import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';

import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { db } from '@/db';
import {
  extras,
  notificationLogs,
  paymentProofs,
  payments,
  quotes,
  refunds,
  reservationChanges,
  reservationExtras,
  reservationNights,
  reservations,
  reservationStatusHistory,
  roomTypes,
} from '@/db/schema';
import { auditLogs } from '@/db/schema/audit';
import type { Reservation } from '@/db/types';
import { createReference } from '@/lib/db/reference';
import {
  findAvailableRoom,
  findRoomTypeBySlug,
} from '@/lib/db/repositories/rooms.repo';
import type { GuestInfo, ReservationSnapshot } from '@/types/booking.types';
import type {
  CheckoutBreakdown,
  ConfirmationMode,
  ExtraSelection,
  GuestReservationStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@/types/checkout.types';
import type {
  HistoryEntry,
  HistoryType,
  PendingChange,
  RefundRecord,
  StoredCancellation,
} from '@/types/manage.types';

type QueryExecutor = Pick<
  typeof db,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>;

export interface StoredReservation {
  id: string;
  roomId: string;
  roomTypeId: string;
  reference: string;
  roomSlug: string;
  stay: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    extraBed: boolean;
  };
  extras: ExtraSelection[];
  totals: {
    totalMinor: number;
    dueNowMinor: number;
    balanceAtHotelMinor: number;
  };
  mode: 'full' | 'deposit' | 'pay_at_hotel';
  confirmationMode: ConfirmationMode;
  method: PaymentMethod | null;
  status: GuestReservationStatus;
  holdExpiresAt: number;
  termsAcceptedAt: string;
  createdAt: number;
  proof: { type: string; size: number } | null;
  guest: GuestInfo;
  snapshot: ReservationSnapshot;
  paidMinor: number;
  paymentReference: string | null;
  paymentProvider: PaymentProvider | 'bank_transfer' | 'cash' | null;
  paidAt: number | null;
  history: HistoryEntry[];
  changeCount: number;
  cancellation: StoredCancellation | null;
  refunds: RefundRecord[];
  pendingChange: PendingChange | null;
  notifications?: { kind: string; detail: string }[];
}

export const newId = () => randomUUID();

function dbStatusOf(status: GuestReservationStatus): Reservation['status'] {
  if (
    [
      'confirmed',
      'checked_in',
      'checked_out',
      'cancelled',
      'expired',
      'no_show',
    ].includes(status)
  )
    return status as Reservation['status'];
  return 'pending';
}

function dbPaymentModeOf(mode: StoredReservation['mode']) {
  return mode === 'full'
    ? 'full_online'
    : mode === 'deposit'
      ? 'deposit_online'
      : 'pay_at_hotel';
}

const paymentModeOf = (mode: string): StoredReservation['mode'] =>
  mode === 'full_online'
    ? 'full'
    : mode === 'deposit_online'
      ? 'deposit'
      : 'pay_at_hotel';

const confirmationOf = (mode: string): ConfirmationMode =>
  mode === 'manual_approval' ? 'manual' : 'instant';

function apiStatus(
  row: Reservation,
  payment: typeof payments.$inferSelect | null,
  proof: boolean,
): GuestReservationStatus {
  if (row.status === 'confirmed') return 'confirmed';
  if (row.status === 'checked_in') return 'checked_in';
  if (row.status === 'checked_out') return 'checked_out';
  if (row.status === 'cancelled') return 'cancelled';
  if (row.status === 'expired') return 'expired';
  if (row.status === 'no_show') return 'no_show';

  const confirmationManual = row.confirmationMode === 'manual_approval';
  if (row.paymentMode === 'pay_at_hotel')
    return confirmationManual ? 'pending_approval' : 'reserved_pay_at_hotel';
  if (!payment) return 'pending_payment';
  if (payment.status === 'failed') return 'payment_failed';
  if (payment.status === 'paid')
    return confirmationManual ? 'pending_approval' : 'confirmed';
  if (payment.provider === 'bank_transfer')
    return proof ? 'awaiting_verification' : 'awaiting_transfer';
  return 'pending_payment';
}

function paymentStatusOf(r: StoredReservation): PaymentStatus {
  if (r.status === 'cancelled') return 'cancelled';
  if (r.status === 'payment_failed') return 'failed';
  if (r.paidMinor > 0 || r.status === 'confirmed') return 'paid';
  if (
    r.status === 'pending_payment' ||
    r.status === 'awaiting_transfer' ||
    r.status === 'awaiting_verification'
  )
    return 'pending';
  return 'none';
}

function historyType(status: Reservation['status']): HistoryType {
  switch (status) {
    case 'confirmed':
      return 'approved';
    case 'checked_in':
      return 'checked_in';
    case 'checked_out':
      return 'checked_out';
    case 'cancelled':
      return 'cancelled';
    case 'expired':
      return 'expired';
    case 'no_show':
      return 'no_show';
    default:
      return 'created';
  }
}

export async function loadStoredReservation(
  reference: string,
  executor: QueryExecutor = db,
): Promise<StoredReservation | null> {
  const [row] = await executor
    .select()
    .from(reservations)
    .where(eq(reservations.reference, reference))
    .limit(1);
  if (!row) return null;

  const [
    roomType,
    extraRows,
    paymentRows,
    historyRows,
    refundRows,
    changeRows,
  ] = await Promise.all([
    executor
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, row.roomTypeId))
      .limit(1),
    executor
      .select()
      .from(reservationExtras)
      .where(eq(reservationExtras.reservationId, row.id)),
    executor
      .select()
      .from(payments)
      .where(eq(payments.reservationId, row.id))
      .orderBy(payments.createdAt),
    executor
      .select()
      .from(reservationStatusHistory)
      .where(eq(reservationStatusHistory.reservationId, row.id))
      .orderBy(reservationStatusHistory.createdAt),
    executor.select().from(refunds).where(eq(refunds.reservationId, row.id)),
    executor
      .select()
      .from(reservationChanges)
      .where(eq(reservationChanges.reservationId, row.id))
      .orderBy(reservationChanges.createdAt),
  ]);

  const room = roomType[0];
  if (!room) return null;
  const latestPayment = paymentRows.at(-1) ?? null;
  const proofRows = latestPayment
    ? await executor
        .select()
        .from(paymentProofs)
        .where(eq(paymentProofs.paymentId, latestPayment.id))
        .limit(1)
    : [];
  const proof = proofRows[0] ?? null;
  const snapshot = (row.snapshot ?? null) as
    (ReservationSnapshot & { cancellation?: StoredCancellation }) | null;
  if (!snapshot) return null;

  const dueNowMinor = row.depositRequiredMinor;
  const change = [...changeRows]
    .reverse()
    .find((c) =>
      [
        'awaiting_payment',
        'awaiting_transfer',
        'awaiting_verification',
        'payment_failed',
      ].includes(c.status),
    );
  const pendingChange: PendingChange | null = change
    ? {
        changeId: change.id,
        checkIn: change.checkIn,
        checkOut: change.checkOut,
        breakdown: change.breakdown as unknown as CheckoutBreakdown,
        totalMinor: change.totalMinor,
        amountDueMinor: change.amountDueMinor,
        holdExpiresAt: change.holdExpiresAt.getTime(),
        method: change.method as PaymentMethod | null,
        status: change.status as PendingChange['status'],
        roomReassigned: change.roomReassigned,
        policy: change.policy as unknown as PendingChange['policy'],
      }
    : null;

  const refundRecords: RefundRecord[] = refundRows.map((r) => ({
    id: r.id,
    at: r.createdAt.getTime(),
    amountMinor: r.amountMinor,
    method: r.method as RefundRecord['method'],
    status: r.status as RefundRecord['status'],
  }));

  const stored: StoredReservation = {
    id: row.id,
    roomId: row.roomId,
    roomTypeId: row.roomTypeId,
    reference: row.reference,
    roomSlug: room.slug,
    stay: {
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      adults: row.adults,
      children: row.children,
      extraBed: Boolean((snapshot.breakdown as CheckoutBreakdown).extraBed),
    },
    extras: extraRows.map((e) => ({
      id: e.extraId ?? e.name,
      quantity: e.quantity,
    })),
    totals: {
      totalMinor: row.totalMinor,
      dueNowMinor,
      balanceAtHotelMinor: Math.max(0, row.totalMinor - dueNowMinor),
    },
    mode: paymentModeOf(row.paymentMode),
    confirmationMode: confirmationOf(row.confirmationMode),
    method:
      latestPayment?.provider === 'bank_transfer'
        ? 'bank_transfer'
        : latestPayment
          ? 'online'
          : null,
    status: apiStatus(row, latestPayment, Boolean(proof)),
    holdExpiresAt: (row.holdExpiresAt ?? row.createdAt).getTime(),
    termsAcceptedAt: (row.termsAcceptedAt ?? row.createdAt).toISOString(),
    createdAt: row.createdAt.getTime(),
    proof: proof ? { type: proof.mimeType, size: proof.sizeBytes } : null,
    guest: {
      fullName: row.guestName,
      email: row.guestEmail ?? '',
      phone: row.guestPhone,
      country: row.guestCountry ?? '',
      arrivalTime: row.arrivalTime ?? '',
      specialRequests: row.specialRequests ?? '',
    },
    snapshot,
    paidMinor: row.amountPaidMinor,
    paymentReference: latestPayment?.reference ?? null,
    paymentProvider: latestPayment?.provider ?? null,
    paidAt: latestPayment?.paidAt?.getTime() ?? null,
    history: historyRows.map((h) => ({
      id: h.id,
      at: h.createdAt.getTime(),
      type: historyType(h.toStatus),
      detail: h.reason ?? undefined,
    })),
    changeCount: row.changeCount,
    cancellation: snapshot.cancellation ?? null,
    refunds: refundRecords,
    pendingChange,
  };

  const now = Date.now();
  let dirty = false;
  const pc = stored.pendingChange;
  if (pc && now > pc.holdExpiresAt && pc.status !== 'awaiting_verification') {
    await db
      .update(reservationChanges)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(reservationChanges.id, pc.changeId));
    stored.pendingChange = null;
    logEvent(
      stored,
      'change_expired',
      'Your current dates stayed as they were.',
    );
    dirty = true;
  }
  if (
    now > stored.holdExpiresAt &&
    ['pending_payment', 'awaiting_transfer', 'payment_failed'].includes(
      stored.status,
    )
  ) {
    stored.status = 'expired';
    logEvent(stored, 'expired');
    dirty = true;
  }
  if (dirty) await saveStoredReservation(stored);
  return stored;
}

export async function saveStoredReservation(
  r: StoredReservation,
): Promise<void> {
  const breakdown = r.snapshot.breakdown;
  const snapshot = {
    ...r.snapshot,
    cancellation: r.cancellation,
    pendingChange: r.pendingChange,
  };
  await db
    .update(reservations)
    .set({
      guestName: r.guest.fullName,
      guestEmail: r.guest.email || null,
      guestEmailMissing: !r.guest.email,
      guestPhone: r.guest.phone,
      guestCountry: r.guest.country || null,
      arrivalTime: r.guest.arrivalTime || null,
      specialRequests: r.guest.specialRequests || null,
      checkIn: r.stay.checkIn,
      checkOut: r.stay.checkOut,
      adults: r.stay.adults,
      children: r.stay.children,
      nights: Math.max(
        1,
        Math.round(
          (new Date(r.stay.checkOut).getTime() -
            new Date(r.stay.checkIn).getTime()) /
            86_400_000,
        ),
      ),
      status: dbStatusOf(r.status),
      paymentMode: dbPaymentModeOf(r.mode),
      confirmationMode:
        r.confirmationMode === 'manual' ? 'manual_approval' : 'instant',
      subtotalMinor:
        breakdown.roomSubtotalMinor + (breakdown.extraBed?.totalMinor ?? 0),
      extrasMinor: breakdown.extras.reduce((sum, e) => sum + e.totalMinor, 0),
      discountMinor: breakdown.discount?.amountMinor ?? 0,
      taxMinor: breakdown.taxMinor,
      serviceChargeMinor: breakdown.serviceChargeMinor,
      totalMinor: r.totals.totalMinor,
      depositRequiredMinor: r.totals.dueNowMinor,
      amountPaidMinor: r.paidMinor,
      balanceMinor: Math.max(0, r.totals.totalMinor - r.paidMinor),
      holdExpiresAt: new Date(r.holdExpiresAt),
      changeCount: r.changeCount,
      cancelledAt:
        r.status === 'cancelled'
          ? new Date(r.cancellation?.at ?? Date.now())
          : null,
      cancellationReason: r.cancellation?.reason ?? null,
      confirmedAt: r.status === 'confirmed' ? new Date() : undefined,
      snapshot: snapshot as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, r.id));

  if (r.cancellation && r.cancellation.refund.refundMinor > 0) {
    const existing = await db
      .select({ id: refunds.id })
      .from(refunds)
      .where(eq(refunds.reservationId, r.id));
    const ids = new Set(existing.map((e) => e.id));
    const additions = r.refunds.filter((refund) => !ids.has(refund.id));
    if (additions.length > 0)
      await db.insert(refunds).values(
        additions.map((refund) => ({
          id: refund.id,
          reservationId: r.id,
          amountMinor: refund.amountMinor,
          method: refund.method,
          status: refund.status,
          timeline: r.cancellation?.refund.timeline ?? null,
          reason: r.cancellation?.reason ?? null,
        })),
      );
  }

  const existingHistory = await db
    .select({ id: reservationStatusHistory.id })
    .from(reservationStatusHistory)
    .where(eq(reservationStatusHistory.reservationId, r.id));
  const historyIds = new Set(existingHistory.map((h) => h.id));
  const newHistory = r.history.filter((h) => !historyIds.has(h.id));
  if (newHistory.length > 0)
    await db.insert(reservationStatusHistory).values(
      newHistory.map((h) => ({
        id: h.id,
        reservationId: r.id,
        fromStatus: null,
        toStatus: dbStatusOf(r.status),
        reason: h.detail ?? h.type,
        metadata: { type: h.type },
        createdAt: new Date(h.at),
      })),
    );

  if (r.notifications?.length) {
    await db.insert(notificationLogs).values(
      r.notifications.map((n) => ({
        reservationId: r.id,
        templateKey: n.kind,
        channel: 'email' as const,
        recipient: r.guest.email || 'guest@example.invalid',
        subject: n.detail,
        status: 'queued' as const,
        dedupeKey: `${r.reference}:${n.kind}:${Date.now()}`,
      })),
    );
    await db.insert(auditLogs).values(
      r.notifications.map((n) => ({
        entity: 'reservation',
        entityId: r.reference,
        action: n.kind,
        changes: { detail: n.detail },
      })),
    );
    r.notifications = [];
  }

  if (r.pendingChange) {
    const pc = r.pendingChange;
    const existing = await db
      .select({ id: reservationChanges.id })
      .from(reservationChanges)
      .where(eq(reservationChanges.id, pc.changeId))
      .limit(1);
    const values = {
      reservationId: r.id,
      checkIn: pc.checkIn,
      checkOut: pc.checkOut,
      breakdown: pc.breakdown as unknown as Record<string, unknown>,
      totalMinor: pc.totalMinor,
      amountDueMinor: pc.amountDueMinor,
      status: pc.status,
      method: pc.method,
      roomReassigned: pc.roomReassigned,
      policy: pc.policy as unknown as Record<string, unknown>,
      holdExpiresAt: new Date(pc.holdExpiresAt),
      updatedAt: new Date(),
    };
    if (existing.length > 0)
      await db
        .update(reservationChanges)
        .set(values)
        .where(eq(reservationChanges.id, pc.changeId));
    else
      await db
        .insert(reservationChanges)
        .values({ id: pc.changeId, ...values });
  } else {
    await db
      .update(reservationChanges)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(
        and(
          eq(reservationChanges.reservationId, r.id),
          inArray(reservationChanges.status, [
            'awaiting_payment',
            'awaiting_transfer',
            'awaiting_verification',
            'payment_failed',
          ]),
        ),
      );
  }
}

export function toReservationResponse(r: StoredReservation) {
  return {
    reference: r.reference,
    status: r.status,
    holdExpiresAt: new Date(r.holdExpiresAt).toISOString(),
    serverTime: new Date().toISOString(),
    confirmationMode: r.confirmationMode,
    amounts: {
      totalMinor: r.totals.totalMinor,
      dueNowMinor: r.totals.dueNowMinor,
      balanceAtHotelMinor: Math.max(0, r.totals.totalMinor - r.paidMinor),
    },
  };
}

export function toStatus(r: StoredReservation) {
  return {
    reference: r.reference,
    status: r.status,
    paymentStatus: paymentStatusOf(r),
    holdExpiresAt: new Date(r.holdExpiresAt).toISOString(),
    serverTime: new Date().toISOString(),
    confirmationMode: r.confirmationMode,
  };
}

export function logEvent(
  r: StoredReservation,
  type: HistoryType,
  detail?: string,
  actor: 'guest' | 'system' = 'system',
): void {
  void actor;
  r.history.push({ id: newId(), at: Date.now(), type, detail });
}

export function notify(
  r: StoredReservation,
  kind: string,
  guestDetail: string,
): void {
  r.notifications ??= [];
  r.notifications.push({ kind, detail: guestDetail });
  logEvent(r, 'email_sent', guestDetail);
}

export function refresh(r: StoredReservation): StoredReservation {
  return r;
}

export function applyStayChange(
  r: StoredReservation,
  c: {
    checkIn: string;
    checkOut: string;
    breakdown: CheckoutBreakdown;
    totalMinor: number;
    paidDeltaMinor: number;
    policy: StoredReservation['snapshot']['policy']['cancellation'];
  },
): void {
  r.stay.checkIn = c.checkIn;
  r.stay.checkOut = c.checkOut;
  r.snapshot.breakdown = c.breakdown;
  r.snapshot.policy.cancellation = c.policy;
  r.paidMinor = Math.max(0, r.paidMinor + c.paidDeltaMinor);
  r.totals = {
    totalMinor: c.totalMinor,
    dueNowMinor:
      r.mode === 'full'
        ? c.totalMinor
        : r.mode === 'deposit'
          ? r.totals.dueNowMinor
          : 0,
    balanceAtHotelMinor: Math.max(0, c.totalMinor - r.paidMinor),
  };
  r.changeCount += 1;
  logEvent(r, 'dates_changed');
}

export async function nextPaymentReference(prefix = 'PAY'): Promise<string> {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function saveQuote(data: {
  id: string;
  reference: string;
  checkIn: string;
  checkOut: string;
  breakdown: CheckoutBreakdown;
  oldTotalMinor: number;
  newTotalMinor: number;
  settle: 'now' | 'at_hotel';
  roomReassigned: boolean;
  policy: PendingChange['policy'];
  expiresAt: number;
}) {
  await db.insert(quotes).values({
    id: data.id,
    reference: data.reference,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    breakdown: data.breakdown as unknown as Record<string, unknown>,
    oldTotalMinor: data.oldTotalMinor,
    newTotalMinor: data.newTotalMinor,
    settle: data.settle,
    roomReassigned: data.roomReassigned,
    policy: data.policy as unknown as Record<string, unknown>,
    expiresAt: new Date(data.expiresAt),
  });
}

export async function getStoredQuote(id: string) {
  const [row] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id))
    .limit(1);
  if (!row || row.expiresAt < new Date()) return null;
  return row;
}

export async function deleteStoredQuote(id: string) {
  await db.delete(quotes).where(eq(quotes.id, id));
}

export async function findRoomForStay(
  roomSlug: string,
  checkIn: string,
  checkOut: string,
) {
  const roomType = await findRoomTypeBySlug(roomSlug);
  if (!roomType) return null;
  const room = await findAvailableRoom(roomType.id, checkIn, checkOut);
  return room ? { roomType, room } : null;
}

export async function getReservationRow(reference: string) {
  const [row] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.reference, reference))
    .limit(1);
  return row ?? null;
}

export async function listReservationPayments(reservationId: string) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.reservationId, reservationId))
    .orderBy(payments.createdAt);
}

export async function deleteEmptyReservation(reference: string) {
  await db.delete(reservations).where(eq(reservations.reference, reference));
}

export {
  reservations,
  payments,
  paymentProofs,
  reservationNights,
  reservationExtras,
  createReference,
};

export async function insertPayment(input: {
  reservationId: string;
  reference: string;
  method: PaymentMethod;
  amountMinor: number;
  provider: PaymentProvider | 'bank_transfer';
  providerReference?: string | null;
  status?: 'pending' | 'paid' | 'failed' | 'refunded';
  note?: string | null;
}) {
  const id = randomUUID();
  await db.insert(payments).values({
    id,
    reservationId: input.reservationId,
    reference: input.reference,
    provider: input.provider,
    providerRef: input.providerReference ?? null,
    channel: input.method,
    amountMinor: input.amountMinor,
    currency: 'NGN',
    status: input.status ?? 'pending',
    note: input.note ?? null,
  });
  return id;
}

export async function completeOnlinePayment(input: {
  provider: PaymentProvider;
  reference: string;
  amountMinor: number;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; already?: boolean }> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.reference, input.reference))
    .limit(1);
  if (!payment || payment.provider !== input.provider) return { ok: false };
  if (payment.status === 'paid') return { ok: true, already: true };
  if (payment.amountMinor !== input.amountMinor) return { ok: false };

  await db
    .update(payments)
    .set({
      status: 'paid',
      paidAt: new Date(),
      netAmountMinor: input.amountMinor,
      providerResponse: input.payload,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  const [row] = await db
    .select({ reference: reservations.reference })
    .from(reservations)
    .where(eq(reservations.id, payment.reservationId))
    .limit(1);
  if (!row) return { ok: false };
  const r = await loadStoredReservation(row.reference);
  if (!r) return { ok: false };

  if (r.status === 'cancelled') {
    logEvent(r, 'payment_received', 'Payment received after cancellation.');
    await saveStoredReservation(r);
    return { ok: true };
  }

  const change = r.pendingChange;
  if (payment.note && change && change.changeId === payment.note) {
    applyStayChange(r, {
      checkIn: change.checkIn,
      checkOut: change.checkOut,
      breakdown: change.breakdown,
      totalMinor: change.totalMinor,
      paidDeltaMinor: input.amountMinor,
      policy: change.policy,
    });
    r.pendingChange = null;
    await db
      .update(reservationChanges)
      .set({
        status: 'completed',
        paymentId: payment.id,
        updatedAt: new Date(),
      })
      .where(eq(reservationChanges.id, change.changeId));
    notify(r, 'dates_changed', SUCCESS_MESSAGES.UPDATED_BOOKING_EMAILED);
  } else {
    r.paidMinor = Math.min(
      r.totals.totalMinor,
      r.paidMinor + input.amountMinor,
    );
    r.paymentReference = payment.reference;
    r.paidAt = Date.now();
    r.method = payment.channel === 'bank_transfer' ? 'bank_transfer' : 'online';
    logEvent(r, 'payment_received', 'Payment received online.');
    if (r.confirmationMode === 'instant') {
      r.status = 'confirmed';
      logEvent(r, 'approved');
    }
    notify(r, 'paid', SUCCESS_MESSAGES.PAYMENT_RECEIVED);
  }
  await saveStoredReservation(r);
  return { ok: true };
}

export async function insertReservation(input: {
  reference: string;
  roomSlug: string;
  stay: StoredReservation['stay'];
  extras: ExtraSelection[];
  quote: Extract<
    import('@/types/checkout.types').CheckoutQuoteResponse,
    { status: 'ok' }
  >;
  settings: import('@/types/checkout.types').CheckoutSettings;
  guest: GuestInfo;
  snapshot: ReservationSnapshot;
}): Promise<StoredReservation | null> {
  const roomType = await findRoomTypeBySlug(input.roomSlug);
  if (!roomType) return null;

  const now = new Date();
  const id = randomUUID();

  const createdId = await db.transaction(async (tx) => {
    const room = await findAvailableRoom(
      roomType.id,
      input.stay.checkIn,
      input.stay.checkOut,
      tx,
    );
    if (!room) return null;

    const row: typeof reservations.$inferInsert = {
      id,
      reference: input.reference,
      roomId: room.id,
      roomTypeId: roomType.id,
      guestName: input.guest.fullName,
      guestEmail: input.guest.email || null,
      guestEmailMissing: !input.guest.email,
      guestPhone: input.guest.phone,
      guestCountry: input.guest.country || null,
      arrivalTime: input.guest.arrivalTime || null,
      specialRequests: input.guest.specialRequests || null,
      checkIn: input.stay.checkIn,
      checkOut: input.stay.checkOut,
      adults: input.stay.adults,
      children: input.stay.children,
      nights: input.quote.breakdown.nights,
      status: 'pending',
      bookingSource: 'website',
      paymentMode: dbPaymentModeOf(input.settings.paymentMode),
      confirmationMode:
        input.settings.confirmationMode === 'manual'
          ? 'manual_approval'
          : 'instant',
      subtotalMinor:
        input.quote.breakdown.roomSubtotalMinor +
        (input.quote.breakdown.extraBed?.totalMinor ?? 0),
      extrasMinor: input.quote.breakdown.extras.reduce(
        (sum, e) => sum + e.totalMinor,
        0,
      ),
      discountMinor: input.quote.breakdown.discount?.amountMinor ?? 0,
      taxMinor: input.quote.breakdown.taxMinor,
      serviceChargeMinor: input.quote.breakdown.serviceChargeMinor,
      totalMinor: input.quote.breakdown.totalMinor,
      depositRequiredMinor: input.quote.payment.dueNowMinor,
      amountPaidMinor: 0,
      amountRefundedMinor: 0,
      balanceMinor: input.quote.payment.totalMinor,
      currency: 'NGN',
      holdExpiresAt: new Date(Date.now() + input.settings.holdSeconds * 1000),
      termsAcceptedAt: now,
      snapshot: input.snapshot as unknown as Record<string, unknown>,
    };
    await tx.insert(reservations).values(row);

    if (input.quote.breakdown.lines.length > 0)
      await tx.insert(reservationNights).values(
        input.quote.breakdown.lines.map((line) => ({
          reservationId: id,
          date: line.date,
          rateMinor: line.rateMinor,
        })),
      );

    if (input.quote.breakdown.extras.length > 0) {
      const extraRows = await tx
        .select()
        .from(extras)
        .where(
          inArray(
            extras.slug,
            input.quote.breakdown.extras.map((e) => e.id),
          ),
        );
      const bySlug = new Map(extraRows.map((e) => [e.slug, e]));
      await tx.insert(reservationExtras).values(
        input.quote.breakdown.extras.map((line) => {
          const extra = bySlug.get(line.id);
          return {
            reservationId: id,
            extraId: extra?.id ?? null,
            name: line.name,
            quantity: line.quantity,
            unitPriceMinor:
              extra?.priceMinor ??
              Math.round(line.totalMinor / Math.max(1, line.quantity)),
            totalMinor: line.totalMinor,
            pricingUnit: extra?.pricingUnit ?? 'per_stay',
          };
        }),
      );
    }

    await tx.insert(reservationStatusHistory).values({
      reservationId: id,
      fromStatus: null,
      toStatus: 'pending',
      reason: 'created',
      metadata: { type: 'created' },
    });

    return id;
  });

  if (!createdId) return null;
  return loadStoredReservation(input.reference);
}
