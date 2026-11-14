/**
 * The booking persistence layer. It maps the API-shaped `StoredReservation` to
 * and from the relational tables, owns the transaction boundaries for writes,
 * and keeps payment, refund, history and notification rows consistent with the
 * reservation they belong to.
 */
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
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
  claimIdempotency,
  finishIdempotency,
  releaseIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import {
  findAvailableRoom,
  findRoomTypeBySlug,
} from '@/lib/db/repositories/rooms.repo';
import { logStructured } from '@/lib/observability';
import { recomputeReservationFinancials } from '@/lib/reservations/payment-ledger';
import type { GuestInfo, ReservationSnapshot } from '@/types/booking.types';
import type {
  ApiError,
  CheckoutBreakdown,
  CheckoutQuoteOk,
  ConfirmationMode,
  ExtraSelection,
  GuestReservationStatus,
  PaymentInitResponse,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  ReservationResponse,
} from '@/types/checkout.types';
import type {
  HistoryEntry,
  HistoryType,
  PendingChange,
  RefundRecord,
  StoredCancellation,
} from '@/types/manage.types';

/** A `db` handle, or the transaction a caller that owns one hands to these helpers. */
export type QueryExecutor = Pick<
  typeof db,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>;

/**
 * Drizzle cannot open a transaction inside a transaction, so a write step that owns
 * one uses it and a step already inside a caller's transaction joins that commit.
 * `executor === db` is the marker for "nobody owns a transaction yet".
 */
async function inTransaction<T>(
  executor: QueryExecutor,
  work: (tx: QueryExecutor) => Promise<T>,
): Promise<T> {
  if (executor !== db) return work(executor);
  return db.transaction((tx) => work(tx));
}

/** The full reservation shape used by guest views and manage mutations. */
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
  refundedMinor: number;
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

/** Generates an opaque id for a new reservation, history entry or quote. */
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

/**
 * Loads a reservation and its related rows by reference. Pass an executor when
 * the caller already owns a transaction.
 */
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
      .select({
        name: reservationExtras.name,
        quantity: reservationExtras.quantity,
        slug: extras.slug,
      })
      .from(reservationExtras)
      .leftJoin(extras, eq(extras.id, reservationExtras.extraId))
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
  const latestPayment =
    [...paymentRows].reverse().find((payment) => payment.type !== 'refund') ??
    null;
  const proofRows = latestPayment
    ? await executor
        .select()
        .from(paymentProofs)
        .where(eq(paymentProofs.paymentId, latestPayment.id))
        .limit(1)
    : [];
  const proof = proofRows[0] ?? null;
  const unresolvedNames = [
    ...new Set(
      extraRows.filter((extra) => !extra.slug).map((extra) => extra.name),
    ),
  ];
  const extraSlugByName = new Map<string, string>();
  if (unresolvedNames.length > 0) {
    const resolved = await executor
      .select({ name: extras.name, slug: extras.slug })
      .from(extras)
      .where(inArray(extras.name, unresolvedNames));
    for (const extra of resolved) extraSlugByName.set(extra.name, extra.slug);
  }
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
      id: e.slug ?? extraSlugByName.get(e.name) ?? e.name,
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
    refundedMinor: row.amountRefundedMinor,
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
    await executor
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
  const expirable =
    ['pending_payment', 'awaiting_transfer', 'payment_failed'].includes(
      stored.status,
    ) ||
    (stored.status === 'pending_approval' && stored.paidMinor === 0);
  if (
    now > stored.holdExpiresAt &&
    stored.mode !== 'pay_at_hotel' &&
    expirable
  ) {
    stored.status = 'expired';
    logEvent(stored, 'expired');
    dirty = true;
  }
  if (dirty) await saveStoredReservation(stored, executor);
  return stored;
}

/**
 * Writes every row that belongs to the reservation — status, history, refunds,
 * notifications, pending change, ledger — as one unit.
 *
 * Called without an executor it owns a transaction. A caller already inside one
 * must pass its `tx`, because Drizzle cannot nest transactions.
 */
export async function saveStoredReservation(
  r: StoredReservation,
  executor: QueryExecutor = db,
): Promise<void> {
  await inTransaction(executor, (tx) => writeStoredReservation(r, tx));
}

async function writeStoredReservation(
  r: StoredReservation,
  executor: QueryExecutor,
): Promise<void> {
  const breakdown = r.snapshot.breakdown;
  const snapshot = {
    ...r.snapshot,
    cancellation: r.cancellation,
    pendingChange: r.pendingChange,
  };
  await executor
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
      amountRefundedMinor: r.refundedMinor,
      balanceMinor: Math.max(
        0,
        r.totals.totalMinor - r.paidMinor + r.refundedMinor,
      ),
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

  if (r.refunds.length > 0) {
    const existing = await executor
      .select({ id: refunds.id })
      .from(refunds)
      .where(eq(refunds.reservationId, r.id));
    const ids = new Set(existing.map((e) => e.id));
    const additions = r.refunds.filter((refund) => !ids.has(refund.id));
    if (additions.length > 0)
      await executor.insert(refunds).values(
        additions.map((refund) => ({
          id: refund.id,
          reservationId: r.id,
          amountMinor: refund.amountMinor,
          method: refund.method,
          status: refund.status,
          timeline: r.cancellation?.refund.timeline ?? null,
          reason: r.cancellation?.reason ?? 'Refund issued',
        })),
      );
  }

  const existingHistory = await executor
    .select({
      id: reservationStatusHistory.id,
      toStatus: reservationStatusHistory.toStatus,
      createdAt: reservationStatusHistory.createdAt,
    })
    .from(reservationStatusHistory)
    .where(eq(reservationStatusHistory.reservationId, r.id))
    .orderBy(reservationStatusHistory.createdAt);
  const historyIds = new Set(existingHistory.map((h) => h.id));
  const newHistory = r.history
    .filter((h) => !historyIds.has(h.id))
    .sort((a, b) => a.at - b.at);
  if (newHistory.length > 0) {
    let previousStatus: Reservation['status'] | null =
      existingHistory.at(-1)?.toStatus ?? null;
    const statusFor: Partial<Record<HistoryType, Reservation['status']>> = {
      created: 'pending',
      approved: 'confirmed',
      cancelled: 'cancelled',
      expired: 'expired',
      checked_in: 'checked_in',
      checked_out: 'checked_out',
      no_show: 'no_show',
    };
    await executor.insert(reservationStatusHistory).values(
      newHistory.map((h) => {
        const nextStatus =
          statusFor[h.type] ?? previousStatus ?? dbStatusOf(r.status);
        const fromStatus = previousStatus;
        previousStatus = nextStatus;
        return {
          id: h.id,
          reservationId: r.id,
          fromStatus,
          toStatus: nextStatus,
          reason: h.detail ?? h.type,
          metadata: { type: h.type },
          createdAt: new Date(h.at),
        };
      }),
    );
  }

  if (r.notifications?.length) {
    await executor.insert(notificationLogs).values(
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
    await executor.insert(auditLogs).values(
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
    const existing = await executor
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
      await executor
        .update(reservationChanges)
        .set(values)
        .where(eq(reservationChanges.id, pc.changeId));
    else
      await executor
        .insert(reservationChanges)
        .values({ id: pc.changeId, ...values });
  } else {
    await executor
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

  const ledger = await recomputeReservationFinancials(
    executor,
    r.id,
    r.totals.totalMinor,
  );
  if (ledger) {
    r.paidMinor = ledger.paidMinor;
    r.refundedMinor = ledger.refundedMinor;
    r.totals.balanceAtHotelMinor = ledger.balanceMinor;
  }
}

async function writeReservationExtras(
  executor: QueryExecutor,
  reservationId: string,
  lines: CheckoutQuoteOk['breakdown']['extras'],
): Promise<void> {
  if (lines.length === 0) return;
  const extraRows = await executor
    .select()
    .from(extras)
    .where(
      inArray(
        extras.slug,
        lines.map((line) => line.id),
      ),
    );
  const bySlug = new Map(extraRows.map((extra) => [extra.slug, extra]));
  await executor.insert(reservationExtras).values(
    lines.map((line) => {
      const extra = bySlug.get(line.id);
      return {
        reservationId,
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

/**
 * Replaces every stored extra line for a reservation from the priced breakdown.
 * The catalog lookup keeps `extra_id` populated, so inventory references and
 * slug-based re-quotes keep working.
 */
export async function replaceReservationExtras(
  reservationId: string,
  lines: CheckoutQuoteOk['breakdown']['extras'],
  executor: QueryExecutor = db,
): Promise<void> {
  await inTransaction(executor, async (tx) => {
    await tx
      .delete(reservationExtras)
      .where(eq(reservationExtras.reservationId, reservationId));
    await writeReservationExtras(tx, reservationId, lines);
  });
}

/** Commits a stay change and its new extra lines as one unit. */
export async function saveStayChange(
  r: StoredReservation,
  lines: CheckoutQuoteOk['breakdown']['extras'],
  executor: QueryExecutor = db,
): Promise<void> {
  await inTransaction(executor, async (tx) => {
    await writeStoredReservation(r, tx);
    await replaceReservationExtras(r.id, lines, tx);
  });
}

function normalizeSelections(selections: ExtraSelection[]): ExtraSelection[] {
  return selections
    .filter((selection) => selection.quantity > 0)
    .map((selection) => ({
      id: selection.id,
      quantity: selection.quantity,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function sameSelections(a: ExtraSelection[], b: ExtraSelection[]): boolean {
  const left = normalizeSelections(a);
  const right = normalizeSelections(b);
  return (
    left.length === right.length &&
    left.every(
      (selection, index) =>
        selection.id === right[index]?.id &&
        selection.quantity === right[index]?.quantity,
    )
  );
}

function sameGuest(a: GuestInfo, b: GuestInfo): boolean {
  return (
    a.fullName === b.fullName &&
    a.email === b.email &&
    a.phone === b.phone &&
    a.country === b.country &&
    a.arrivalTime === b.arrivalTime &&
    a.specialRequests === b.specialRequests
  );
}

/** Result of trying to edit a live checkout hold. */
export type HoldUpdateOutcome =
  'not_found' | 'not_allowed' | 'hold_expired' | 'ok';

/**
 * Updates the details and extras on a live hold. The reservation row is locked
 * first, so a payment cannot complete while the total is being rewritten. Changing
 * the amount supersedes any pending provider session, which the webhook guard
 * later refunds if it still gets paid.
 */
export async function updateReservationHold(input: {
  reference: string;
  guest: GuestInfo;
  extraBed: boolean;
  quote: CheckoutQuoteOk;
  executor?: QueryExecutor;
}): Promise<{
  outcome: HoldUpdateOutcome;
  updated: boolean;
  reservation: StoredReservation | null;
}> {
  const executor = input.executor ?? db;
  return inTransaction(executor, async (tx) => {
    const [row] = await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.reference, input.reference))
      .limit(1)
      .for('update');
    if (!row) {
      return {
        outcome: 'not_found' as const,
        updated: false,
        reservation: null,
      };
    }

    const r = await loadStoredReservation(input.reference, tx);
    if (!r) {
      return {
        outcome: 'not_found' as const,
        updated: false,
        reservation: null,
      };
    }
    if (r.status === 'expired') {
      return {
        outcome: 'hold_expired' as const,
        updated: false,
        reservation: r,
      };
    }
    if (
      !['pending_payment', 'awaiting_transfer', 'payment_failed'].includes(
        r.status,
      ) ||
      r.proof !== null ||
      r.paidMinor > 0
    ) {
      return {
        outcome: 'not_allowed' as const,
        updated: false,
        reservation: r,
      };
    }

    const extras = input.quote.breakdown.extras.map((line) => ({
      id: line.id,
      quantity: line.quantity,
    }));
    const changed =
      !sameGuest(r.guest, input.guest) ||
      r.stay.extraBed !== input.extraBed ||
      !sameSelections(r.extras, extras);
    if (!changed) {
      return { outcome: 'ok' as const, updated: false, reservation: r };
    }

    const amountChanged =
      r.totals.dueNowMinor !== input.quote.payment.dueNowMinor;
    r.guest = input.guest;
    r.stay.extraBed = input.extraBed;
    r.extras = extras;
    r.snapshot.breakdown = input.quote.breakdown;
    r.totals = {
      totalMinor: input.quote.payment.totalMinor,
      dueNowMinor: input.quote.payment.dueNowMinor,
      balanceAtHotelMinor: input.quote.payment.balanceAtHotelMinor,
    };

    await replaceReservationExtras(r.id, input.quote.breakdown.extras, tx);

    if (amountChanged) {
      await tx
        .update(payments)
        .set({
          status: 'failed',
          failedAt: new Date(),
          providerResponse: {
            reason: 'superseded',
            source: 'checkout_hold_update',
          },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(payments.reservationId, r.id),
            eq(payments.status, 'pending'),
            inArray(payments.type, ['deposit', 'balance', 'full']),
          ),
        );
      if (r.status === 'awaiting_transfer') r.status = 'pending_payment';
      r.paymentReference = null;
    }

    logEvent(
      r,
      'details_changed',
      amountChanged
        ? 'Checkout details changed; the payment amount was updated.'
        : 'Checkout details updated.',
    );
    await saveStoredReservation(r, tx);
    return { outcome: 'ok' as const, updated: true, reservation: r };
  });
}

/** The compact reservation payload returned when a hold is created. */
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
      balanceAtHotelMinor: Math.max(
        0,
        r.totals.totalMinor - r.paidMinor + r.refundedMinor,
      ),
    },
  };
}

/** The status payload used by checkout polling and the manage page. */
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

/** Appends a plain-language history entry to the in-memory reservation. */
export function logEvent(
  r: StoredReservation,
  type: HistoryType,
  detail?: string,
  actor: 'guest' | 'system' = 'system',
): void {
  void actor;
  r.history.push({ id: newId(), at: Date.now(), type, detail });
}

/** Queues a guest notification and records it in the timeline. */
export function notify(
  r: StoredReservation,
  kind: string,
  guestDetail: string,
): void {
  r.notifications ??= [];
  r.notifications.push({ kind, detail: guestDetail });
  logEvent(r, 'email_sent', guestDetail);
}

/** Identity helper for callers that need to signal a fresh read. */
export function refresh(r: StoredReservation): StoredReservation {
  return r;
}

/**
 * Applies new dates, breakdown, totals and policy to the in-memory reservation
 * and increments the change counter.
 */
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
    balanceAtHotelMinor: Math.max(
      0,
      c.totalMinor - r.paidMinor + r.refundedMinor,
    ),
  };
  r.changeCount += 1;
  logEvent(r, 'dates_changed');
}

/** Generates a unique, human-readable payment reference. */
export async function nextPaymentReference(prefix = 'PAY'): Promise<string> {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

/** Persists a short-lived date-change quote for a later commit. */
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

/** Loads a stored quote, returning `null` once it has expired. */
export async function getStoredQuote(id: string) {
  const [row] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id))
    .limit(1);
  if (!row || row.expiresAt < new Date()) return null;
  return row;
}

/** Deletes a committed or abandoned date-change quote. */
export async function deleteStoredQuote(id: string) {
  await db.delete(quotes).where(eq(quotes.id, id));
}

/** Finds an active room type and a free room for the requested stay. */
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

/** Loads the raw reservation row for a reference. */
export async function getReservationRow(reference: string) {
  const [row] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.reference, reference))
    .limit(1);
  return row ?? null;
}

/** Lists a reservation's payments in creation order. */
export async function listReservationPayments(reservationId: string) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.reservationId, reservationId))
    .orderBy(payments.createdAt);
}

/** Deletes a reservation created during a checkout attempt that wrote nothing. */
export async function deleteEmptyReservation(reference: string) {
  await db.delete(reservations).where(eq(reservations.reference, reference));
}

export {
  createReference,
  paymentProofs,
  payments,
  reservationExtras,
  reservationNights,
  reservations,
};

/** Inserts a payment row and returns its generated id. */
export async function insertPayment(
  input: {
    reservationId: string;
    reference: string;
    method: PaymentMethod;
    amountMinor: number;
    provider: PaymentProvider | 'bank_transfer';
    providerReference?: string | null;
    status?: 'pending' | 'paid' | 'failed' | 'refunded';
    note?: string | null;
  },
  executor: QueryExecutor = db,
) {
  const id = randomUUID();
  await executor.insert(payments).values({
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

function supersededByHoldUpdate(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const response = value as {
    reason?: unknown;
    source?: unknown;
    supersededBy?: unknown;
  };
  return (
    (response.reason === 'superseded' &&
      response.source === 'checkout_hold_update') ||
    response.supersededBy === 'checkout_hold_update'
  );
}

async function recordLatePaymentRefund(
  executor: QueryExecutor,
  r: StoredReservation,
  payment: typeof payments.$inferSelect,
  reason: string,
): Promise<void> {
  const [existing] = await executor
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.refundOfPaymentId, payment.id),
        eq(payments.type, 'refund'),
      ),
    )
    .limit(1);
  if (existing) return;

  const refundPaymentId = randomUUID();
  await executor.insert(payments).values({
    id: refundPaymentId,
    reservationId: r.id,
    refundOfPaymentId: payment.id,
    reference: createReference(),
    provider: payment.provider,
    type: 'refund',
    status: 'pending',
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    channel: 'provider',
    note: reason,
  });
  await executor.insert(refunds).values({
    reservationId: r.id,
    paymentId: refundPaymentId,
    amountMinor: payment.amountMinor,
    method: 'original_payment',
    status: 'initiated',
    reason,
  });
}

/** Finds a pending payment that can be reused for the same amount and provider. */
export async function findReusablePayment(
  input: {
    reservationId: string;
    provider: PaymentProvider | 'bank_transfer';
    amountMinor: number;
    changeId?: string | null;
  },
  executor: QueryExecutor = db,
) {
  const [row] = await executor
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.reservationId, input.reservationId),
        eq(payments.provider, input.provider),
        eq(payments.status, 'pending'),
        eq(payments.amountMinor, input.amountMinor),
        input.changeId
          ? eq(payments.note, input.changeId)
          : isNull(payments.note),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * One live transfer attempt per reservation: the reference the guest is given must
 * not change between retries, otherwise the receipt they upload matches nothing.
 * The reservation row is locked first so two near-simultaneous calls cannot both
 * decide the attempt is missing. A `failed` or `refunded` row is not reusable, so a
 * fresh attempt is still created wherever the payment lifecycle allows one.
 */
export async function ensureBankTransferPayment(
  input: {
    reservationId: string;
    amountMinor: number;
  },
  executor: QueryExecutor = db,
): Promise<{ reference: string; reused: boolean }> {
  return inTransaction(executor, async (tx) => {
    await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.id, input.reservationId))
      .limit(1)
      .for('update');

    const reusable = await findReusablePayment(
      {
        reservationId: input.reservationId,
        provider: 'bank_transfer',
        amountMinor: input.amountMinor,
      },
      tx,
    );
    if (reusable) return { reference: reusable.reference, reused: true };

    const reference = createReference();
    await insertPayment(
      {
        reservationId: input.reservationId,
        reference,
        method: 'bank_transfer',
        amountMinor: input.amountMinor,
        provider: 'bank_transfer',
      },
      tx,
    );
    return { reference, reused: false };
  });
}

/**
 * Marks a provider payment as paid and advances the reservation in one locked
 * transaction. Idempotent for an already-paid reference; a mismatched amount is
 * rejected. Returns `already` when the payment was already complete.
 */
export async function completeOnlinePayment(input: {
  provider: PaymentProvider;
  reference: string;
  amountMinor: number;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; already?: boolean }> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.reference, input.reference))
      .limit(1)
      .for('update');
    if (!payment || payment.provider !== input.provider) return { ok: false };

    const alreadyPaid = payment.status === 'paid';
    if (!alreadyPaid && payment.amountMinor !== input.amountMinor)
      return { ok: false };

    const [row] = await tx
      .select({ id: reservations.id, reference: reservations.reference })
      .from(reservations)
      .where(eq(reservations.id, payment.reservationId))
      .limit(1)
      .for('update');
    if (!row) return { ok: false };

    const r = await loadStoredReservation(row.reference, tx);
    if (!r) return { ok: false };

    const [changeRow] = payment.note
      ? await tx
          .select()
          .from(reservationChanges)
          .where(
            and(
              eq(reservationChanges.id, payment.note),
              eq(reservationChanges.reservationId, r.id),
            ),
          )
          .limit(1)
          .for('update')
      : [];

    const activeChange =
      changeRow &&
      ['awaiting_payment', 'awaiting_transfer'].includes(changeRow.status)
        ? changeRow
        : null;
    const isChangePayment = Boolean(changeRow);

    const markPaid = async (superseded = false) => {
      if (alreadyPaid) return;
      await tx
        .update(payments)
        .set({
          status: 'paid',
          paidAt: new Date(),
          netAmountMinor: input.amountMinor,
          providerResponse: superseded
            ? {
                ...input.payload,
                supersededBy: 'checkout_hold_update',
              }
            : input.payload,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
    };

    if (supersededByHoldUpdate(payment.providerResponse)) {
      await markPaid(true);
      logEvent(
        r,
        'payment_received',
        'Payment received after checkout details changed.',
      );
      await recordLatePaymentRefund(
        tx,
        r,
        payment,
        'Payment received after checkout details changed',
      );
      await saveStoredReservation(r, tx);
      logStructured(
        'payment.hold_superseded',
        {
          reference: payment.reference,
          reservation: r.reference,
        },
        'warn',
      );
      return { ok: true };
    }

    if (r.status === 'cancelled' || r.status === 'expired') {
      await markPaid();
      if (changeRow) {
        await tx
          .update(reservationChanges)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(reservationChanges.id, changeRow.id));
      }
      logEvent(
        r,
        'payment_received',
        r.status === 'cancelled'
          ? 'Payment received after cancellation.'
          : 'Payment received after the hold expired.',
      );
      await recordLatePaymentRefund(
        tx,
        r,
        payment,
        r.status === 'cancelled'
          ? 'Payment received after cancellation'
          : 'Payment received after hold expiry',
      );
      await saveStoredReservation(r, tx);
      logStructured(
        'payment.unapplied',
        {
          reference: payment.reference,
          reservation: r.reference,
          reservationStatus: r.status,
          alreadyPaid,
        },
        'warn',
      );
      return { ok: true, already: alreadyPaid || undefined };
    }

    if (isChangePayment && !activeChange) {
      await markPaid();
      await recordLatePaymentRefund(
        tx,
        r,
        payment,
        'Payment received after the change hold expired',
      );
      await saveStoredReservation(r, tx);
      logStructured(
        'payment.change_expired',
        {
          reference: payment.reference,
          reservation: r.reference,
          changeId: changeRow?.id,
        },
        'warn',
      );
      return { ok: true, already: alreadyPaid || undefined };
    }

    const change = r.pendingChange;
    if (activeChange && change && change.changeId === activeChange.id) {
      if (!alreadyPaid && payment.amountMinor !== change.amountDueMinor)
        return { ok: false };

      const available = await findAvailableRoom(
        r.roomTypeId,
        change.checkIn,
        change.checkOut,
        tx,
        r.id,
      );
      if (!available) {
        await markPaid();
        await recordLatePaymentRefund(
          tx,
          r,
          payment,
          'New dates unavailable at payment completion',
        );
        await tx
          .update(reservationChanges)
          .set({ status: 'rejected', updatedAt: new Date() })
          .where(eq(reservationChanges.id, change.changeId));
        r.pendingChange = null;
        await saveStoredReservation(r, tx);
        logStructured(
          'payment.change_unavailable',
          {
            reference: payment.reference,
            reservation: r.reference,
            changeId: change.changeId,
          },
          'warn',
        );
        return { ok: true, already: alreadyPaid || undefined };
      }

      await markPaid();
      applyStayChange(r, {
        checkIn: change.checkIn,
        checkOut: change.checkOut,
        breakdown: change.breakdown,
        totalMinor: change.totalMinor,
        paidDeltaMinor: payment.amountMinor,
        policy: change.policy,
      });
      await replaceReservationExtras(r.id, change.breakdown.extras, tx);
      r.pendingChange = null;
      await tx
        .delete(reservationNights)
        .where(eq(reservationNights.reservationId, r.id));
      if (change.breakdown.lines.length > 0)
        await tx.insert(reservationNights).values(
          change.breakdown.lines.map((line) => ({
            reservationId: r.id,
            date: line.date,
            rateMinor: line.rateMinor,
          })),
        );
      await tx
        .update(reservationChanges)
        .set({
          status: 'completed',
          paymentId: payment.id,
          updatedAt: new Date(),
        })
        .where(eq(reservationChanges.id, change.changeId));
      notify(r, 'dates_changed', SUCCESS_MESSAGES.UPDATED_BOOKING_EMAILED);
    } else {
      await markPaid();
      if (!alreadyPaid) {
        logEvent(r, 'payment_received', 'Payment received online.');
        if (r.confirmationMode === 'instant') {
          r.status = 'confirmed';
          logEvent(r, 'approved');
        }
        notify(r, 'paid', SUCCESS_MESSAGES.PAYMENT_RECEIVED);
      }
      r.paymentReference = payment.reference;
      r.paidAt = payment.paidAt?.getTime() ?? Date.now();
      r.method =
        payment.channel === 'bank_transfer' ? 'bank_transfer' : 'online';
      if (
        r.confirmationMode === 'instant' &&
        ['pending_payment', 'awaiting_transfer', 'payment_failed'].includes(
          r.status,
        )
      ) {
        r.status = 'confirmed';
        logEvent(r, 'approved');
      }
    }
    await saveStoredReservation(r, tx);
    if (alreadyPaid)
      logStructured('payment.repaired', {
        reference: payment.reference,
        reservation: r.reference,
      });
    return { ok: true, already: alreadyPaid || undefined };
  });
}

/**
 * Marks a pending provider payment as failed. A non-pending payment is left
 * untouched, so a late failure cannot undo a successful charge.
 */
export async function failOnlinePayment(input: {
  provider: PaymentProvider;
  reference: string;
  payload: Record<string, unknown>;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.reference, input.reference))
      .limit(1)
      .for('update');
    if (!payment || payment.provider !== input.provider) return false;
    if (payment.status !== 'pending') return false;

    await tx
      .update(payments)
      .set({
        status: 'failed',
        failedAt: new Date(),
        providerResponse: input.payload,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    logStructured('payment.failed', {
      reference: payment.reference,
      reservationId: payment.reservationId,
      provider: payment.provider,
    });
    return true;
  });
}

/**
 * Releases the guest's own earlier hold so it cannot block the replacement. Only a
 * row the caller already authorized is touched, and only while it is still an
 * unpaid hold: money in, or a receipt uploaded, and the row is left exactly as it
 * was. The room is then re-allocated without an exclusion, so two live holds can
 * never exist for the same room.
 */
async function releaseOwnHold(
  tx: QueryExecutor,
  reservationId?: string | null,
): Promise<void> {
  if (!reservationId) return;

  const [target] = await tx
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.status, 'pending'),
        eq(reservations.amountPaidMinor, 0),
        ne(reservations.paymentMode, 'pay_at_hotel'),
      ),
    )
    .limit(1)
    .for('update');
  if (!target) return;

  const [blocked] = await tx
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.reservationId, reservationId),
        inArray(payments.status, ['paid', 'refunded']),
      ),
    )
    .limit(1);
  if (blocked) return;

  const [proof] = await tx
    .select({ id: paymentProofs.id })
    .from(paymentProofs)
    .innerJoin(payments, eq(payments.id, paymentProofs.paymentId))
    .where(eq(payments.reservationId, reservationId))
    .limit(1);
  if (proof) return;

  await tx
    .update(reservations)
    .set({
      status: 'expired',
      holdExpiresAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.status, 'pending'),
      ),
    );

  await tx.insert(reservationStatusHistory).values({
    reservationId,
    fromStatus: 'pending',
    toStatus: 'expired',
    reason: 'replaced',
    metadata: { type: 'replaced' },
  });

  await tx
    .update(payments)
    .set({
      status: 'failed',
      failedAt: new Date(),
      providerResponse: { reason: 'replaced', source: 'reservation_replaced' },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(payments.reservationId, reservationId),
        eq(payments.status, 'pending'),
        inArray(payments.type, ['deposit', 'balance', 'full']),
      ),
    );
}

/**
 * Creates a reservation, its nights, extras and initial history in one
 * transaction. A supplied `supersedeReservationId` is expired in the same
 * transaction so the guest never holds two rooms for the same stay.
 */
export async function insertReservation(
  input: {
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
    /**
     * A hold the same guest already has on this stay, derived from their own booking
     * access cookie by the caller. Released here, in the transaction that takes the
     * new one, so replacing a stay never needs two live holds at once.
     */
    supersedeReservationId?: string | null;
  },
  executor: QueryExecutor = db,
): Promise<StoredReservation | null> {
  const roomType = await findRoomTypeBySlug(input.roomSlug);
  if (!roomType) return null;

  const now = new Date();
  const id = randomUUID();

  const createdId = await inTransaction(executor, async (tx) => {
    await tx.execute(sql`
      UPDATE reservations r
      SET status = 'expired', updated_at = now()
      WHERE r.status = 'pending'
        AND r.payment_mode <> 'pay_at_hotel'
        AND r.hold_expires_at IS NOT NULL
        AND r.hold_expires_at < now()
        AND r.room_id IN (
          SELECT id FROM rooms WHERE room_type_id = ${roomType.id}
        )
        AND NOT EXISTS (
          SELECT 1 FROM payments p
          WHERE p.reservation_id = r.id AND p.status = 'paid'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM payment_proofs pp
          JOIN payments p ON p.id = pp.payment_id
          WHERE p.reservation_id = r.id
        )
    `);

    await releaseOwnHold(tx, input.supersedeReservationId);

    const room = await findAvailableRoom(
      roomType.id,
      input.stay.checkIn,
      input.stay.checkOut,
      tx,
    );
    if (!room) return null;

    const payAtHotel = input.settings.paymentMode === 'pay_at_hotel';
    const initialStatus = payAtHotel ? 'confirmed' : 'pending';
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
      status: initialStatus,
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
      confirmedAt: payAtHotel ? now : null,
      confirmedBy: null,
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
      await replaceReservationExtras(id, input.quote.breakdown.extras, tx);
    }

    await tx.insert(reservationStatusHistory).values({
      reservationId: id,
      fromStatus: null,
      toStatus: initialStatus,
      reason: payAtHotel ? 'pay_at_hotel_auto_confirmed' : 'created',
      metadata: { type: 'created' },
    });

    return id;
  });

  if (!createdId) return null;
  return loadStoredReservation(input.reference, executor);
}

/** The outcome of an atomic, idempotent reservation creation attempt. */
export type CreateReservationOutcome =
  | { replay: ReservationResponse }
  | { locked: true }
  | { unavailable: true }
  | { created: ReservationResponse };

/**
 * Claims an idempotency key, creates the reservation and stores its replayable
 * response in one transaction. A failure partway through therefore leaves
 * either a payable reservation with a replayable response or nothing at all.
 */
export async function createReservationWithIdempotency(
  input: Parameters<typeof insertReservation>[0],
  idKey: string,
  claimExtra?: Parameters<typeof claimIdempotency>[2],
): Promise<CreateReservationOutcome> {
  return db.transaction(async (tx) => {
    const claim = await claimIdempotency(idKey, 120, claimExtra, tx);
    if (!claim.claimed) {
      if (claim.record?.response)
        return { replay: claim.record.response as ReservationResponse };
      return { locked: true };
    }

    const reservation = await insertReservation(input, tx);
    if (!reservation) {
      await releaseIdempotency(idKey, tx);
      return { unavailable: true };
    }

    const response = toReservationResponse(reservation);
    await finishIdempotency(
      idKey,
      response,
      201,
      60,
      { reservationId: reservation.id },
      tx,
    );
    return { created: response };
  });
}

/** The outcome of recording an uploaded bank-transfer receipt. */
export type TransferProofOutcome =
  | { ok: true; status?: ReturnType<typeof toStatus> }
  | {
      ok: false;
      reason:
        | 'reservation_not_found'
        | 'hold_expired'
        | 'not_awaiting_transfer'
        | 'change_not_awaiting_transfer';
    };

/**
 * Records the uploaded receipt, its payment row and the resulting status in one
 * commit. The reservation is locked and re-read first, so a webhook or a second
 * upload that moved it while the file was in flight is seen here instead of
 * being overwritten by the copy read before the storage call.
 */
export async function recordTransferProof(input: {
  reference: string;
  reservationId: string;
  changeId: string | null;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<TransferProofOutcome> {
  return db.transaction(async (tx): Promise<TransferProofOutcome> => {
    await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.id, input.reservationId))
      .limit(1)
      .for('update');

    const fresh = await loadStoredReservation(input.reference, tx);
    if (!fresh) return { ok: false, reason: 'reservation_not_found' };

    if (input.changeId) {
      const change = fresh.pendingChange;
      if (
        !change ||
        change.changeId !== input.changeId ||
        change.status !== 'awaiting_transfer'
      )
        return { ok: false, reason: 'change_not_awaiting_transfer' };

      const reusable = await findReusablePayment(
        {
          reservationId: fresh.id,
          provider: 'bank_transfer',
          amountMinor: change.amountDueMinor,
          changeId: change.changeId,
        },
        tx,
      );
      const paymentId =
        reusable?.id ??
        (await insertPayment(
          {
            reservationId: fresh.id,
            reference: createReference(),
            method: 'bank_transfer',
            amountMinor: change.amountDueMinor,
            provider: 'bank_transfer',
            note: change.changeId,
          },
          tx,
        ));
      await tx
        .update(reservationChanges)
        .set({ paymentId, updatedAt: new Date() })
        .where(eq(reservationChanges.id, change.changeId));
      await tx.insert(paymentProofs).values({
        paymentId,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      });
      change.status = 'awaiting_verification';
      logEvent(fresh, 'transfer_proof_received', 'For your new dates', 'guest');
      await saveStoredReservation(fresh, tx);
      return { ok: true };
    }

    if (fresh.status === 'expired')
      return { ok: false, reason: 'hold_expired' };
    if (fresh.status !== 'awaiting_transfer')
      return { ok: false, reason: 'not_awaiting_transfer' };

    // `initialize` already created the transfer attempt the guest was shown, so the
    // proof joins that row instead of opening a second one for the same receipt.
    const reusable = await findReusablePayment(
      {
        reservationId: fresh.id,
        provider: 'bank_transfer',
        amountMinor: fresh.totals.dueNowMinor,
      },
      tx,
    );
    const paymentId =
      reusable?.id ??
      (await insertPayment(
        {
          reservationId: fresh.id,
          reference: createReference(),
          method: 'bank_transfer',
          amountMinor: fresh.totals.dueNowMinor,
          provider: 'bank_transfer',
        },
        tx,
      ));
    await tx.insert(paymentProofs).values({
      paymentId,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
    fresh.proof = { type: input.mimeType, size: input.sizeBytes };
    fresh.status = 'awaiting_verification';
    logEvent(fresh, 'transfer_proof_received', undefined, 'guest');
    await saveStoredReservation(fresh, tx);
    return { ok: true, status: toStatus(fresh) };
  });
}

/** The step that runs inside a payment initialization transaction. */
export type PaymentInitStep =
  | { response: PaymentInitResponse }
  | { reject: { status: number; error: ApiError } };

/** The outcome of a committed payment initialization attempt. */
export type PaymentInitOutcome =
  | { kind: 'ok'; response: PaymentInitResponse }
  | { kind: 'replay'; response: PaymentInitResponse }
  | { kind: 'in_progress' }
  | { kind: 'rejected'; status: number; error: ApiError };

/**
 * Commits an initialize step in one transaction: the claim, the payment row, the
 * stamped reservation and the reply that replays them either all exist or none do, so
 * a request that dies partway can never leave a hold the guest cannot pay or a reply
 * that points at nothing.
 *
 * The reservation is locked and re-read before any of it runs, so a webhook or the
 * expiry cron that moved the row while this request was in flight is seen here instead
 * of overwritten by the copy the route read earlier.
 */
export async function commitPaymentInit(input: {
  idKey: string;
  reference: string;
  reservationId: string;
  apply: (ctx: {
    r: StoredReservation;
    tx: QueryExecutor;
  }) => Promise<PaymentInitStep>;
}): Promise<PaymentInitOutcome> {
  return db.transaction(async (tx): Promise<PaymentInitOutcome> => {
    const claim = await claimIdempotency(
      input.idKey,
      120,
      { method: 'POST', path: '/api/payments/initialize' },
      tx,
    );
    if (!claim.claimed) {
      if (claim.record?.response)
        return {
          kind: 'replay',
          response: claim.record.response as PaymentInitResponse,
        };
      return { kind: 'in_progress' };
    }

    await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.id, input.reservationId))
      .limit(1)
      .for('update');

    const fresh = await loadStoredReservation(input.reference, tx);
    if (!fresh) {
      await releaseIdempotency(input.idKey, tx);
      return {
        kind: 'rejected',
        status: 404,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: ERROR_MESSAGES.RESERVATION_NOT_FOUND,
        },
      };
    }

    const step = await input.apply({ r: fresh, tx });
    if ('reject' in step) {
      await releaseIdempotency(input.idKey, tx);
      return { kind: 'rejected', ...step.reject };
    }

    await finishIdempotency(
      input.idKey,
      step.response,
      200,
      60,
      { reservationId: input.reservationId },
      tx,
    );
    return { kind: 'ok', response: step.response };
  });
}
