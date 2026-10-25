import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  payments,
  reservationExtras,
  reservationNights,
  reservations,
  reservationStatusHistory,
} from '@/db/schema';
import type { Reservation } from '@/db/types';
import { createReference } from '@/lib/db/utils/reference';

export async function findReservationByReference(reference: string) {
  const [row] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.reference, reference))
    .limit(1);
  return row ?? null;
}

export async function findReservationsByRoomAndDates(
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeRef?: string,
) {
  const conditions = [
    eq(reservations.roomId, roomId),
    sql`${reservations.status} IN ('pending','confirmed','checked_in')`,
    sql`daterange(${reservations.checkIn}, ${reservations.checkOut}, '[)') && daterange(${checkIn}::date, ${checkOut}::date, '[)')`,
  ];
  if (excludeRef) {
    conditions.push(sql`${reservations.reference} != ${excludeRef}`);
  }
  return db
    .select()
    .from(reservations)
    .where(and(...conditions));
}

export async function getReservationHistory(reference: string) {
  const res = await findReservationByReference(reference);
  if (!res) return [];
  return db
    .select()
    .from(reservationStatusHistory)
    .where(eq(reservationStatusHistory.reservationId, res.id))
    .orderBy(reservationStatusHistory.createdAt);
}

export async function addReservationHistory(
  reservationId: string,
  fromStatus: Reservation['status'],
  toStatus: Reservation['status'],
  reason?: string | null,
  changedBy?: string | null,
  metadata?: unknown,
) {
  await db.insert(reservationStatusHistory).values({
    reservationId,
    fromStatus,
    toStatus,
    reason,
    changedBy,
    metadata,
  });
}

export async function updateReservationStatus(
  reference: string,
  status: Reservation['status'],
  extra?: Partial<typeof reservations.$inferInsert>,
) {
  const res = await findReservationByReference(reference);
  if (!res) return null;
  const [updated] = await db
    .update(reservations)
    .set({ status: status, updatedAt: new Date(), ...extra })
    .where(eq(reservations.reference, reference))
    .returning();
  await addReservationHistory(
    res.id,
    res.status,
    status,
    extra?.cancellationReason,
  );
  return updated;
}

export async function getReservationExtras(reservationId: string) {
  return db
    .select()
    .from(reservationExtras)
    .where(eq(reservationExtras.reservationId, reservationId));
}

export async function getReservationNights(reservationId: string) {
  return db
    .select()
    .from(reservationNights)
    .where(eq(reservationNights.reservationId, reservationId));
}

export async function getReservationPayments(reservationId: string) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.reservationId, reservationId))
    .orderBy(payments.createdAt);
}

export { createReference };
