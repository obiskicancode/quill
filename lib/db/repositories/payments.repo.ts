import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { payments } from '@/db/schema';
import type { NewPayment, Payment } from '@/db/types';

export async function createPayment(data: NewPayment): Promise<Payment> {
  const [row] = await db.insert(payments).values(data).returning();
  return row;
}

export async function findPaymentById(id: string): Promise<Payment | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  return row ?? null;
}

export async function findPaymentByReference(
  reference: string,
): Promise<Payment | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.reference, reference))
    .limit(1);
  return row ?? null;
}

export async function findPaymentsByReservationId(
  reservationId: string,
): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(eq(payments.reservationId, reservationId))
    .orderBy(desc(payments.createdAt));
}

export async function updatePayment(
  reference: string,
  data: Partial<NewPayment>,
): Promise<Payment | null> {
  const [row] = await db
    .update(payments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(payments.reference, reference))
    .returning();
  return row ?? null;
}

export async function updatePaymentById(
  id: string,
  data: Partial<NewPayment>,
): Promise<Payment | null> {
  const [row] = await db
    .update(payments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(payments.id, id))
    .returning();
  return row ?? null;
}
