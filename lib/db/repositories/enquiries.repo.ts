/**
 * Persistence helpers for enquiries and their threaded replies and internal
 * notes. List queries return newest first; missing rows resolve to `null`.
 */
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { enquiries, enquiryNotes, enquiryReplies } from '@/db/schema';
import type {
  Enquiry,
  EnquiryNote,
  EnquiryReply,
  NewEnquiry,
  NewEnquiryNote,
  NewEnquiryReply,
} from '@/db/types';

/** Lists all enquiries, newest first. */
export async function listEnquiries(): Promise<Enquiry[]> {
  return db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
}

/** Finds an enquiry by id, or `null` when absent. */
export async function getEnquiryById(id: string): Promise<Enquiry | null> {
  const [row] = await db
    .select()
    .from(enquiries)
    .where(eq(enquiries.id, id))
    .limit(1);
  return row ?? null;
}

/** Inserts an enquiry and returns the created row. */
export async function createEnquiry(data: NewEnquiry): Promise<Enquiry> {
  const [row] = await db.insert(enquiries).values(data).returning();
  return row;
}

/**
 * Partially updates an enquiry, stamping `updatedAt`; returns `null` when no
 * row matched.
 */
export async function updateEnquiry(
  id: string,
  data: Partial<NewEnquiry>,
): Promise<Enquiry | null> {
  const [row] = await db
    .update(enquiries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(enquiries.id, id))
    .returning();
  return row ?? null;
}

/**
 * Stamps `readAt` and `updatedAt`; returns `null` when the enquiry is missing.
 */
export async function markEnquiryRead(id: string): Promise<Enquiry | null> {
  const [row] = await db
    .update(enquiries)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(eq(enquiries.id, id))
    .returning();
  return row ?? null;
}

/** Lists an enquiry's replies, newest first. */
export async function listEnquiryReplies(
  enquiryId: string,
): Promise<EnquiryReply[]> {
  return db
    .select()
    .from(enquiryReplies)
    .where(eq(enquiryReplies.enquiryId, enquiryId))
    .orderBy(desc(enquiryReplies.createdAt));
}

/** Inserts a reply for an enquiry and returns the created row. */
export async function addEnquiryReply(
  data: NewEnquiryReply,
): Promise<EnquiryReply> {
  const [row] = await db.insert(enquiryReplies).values(data).returning();
  return row;
}

/** Lists an enquiry's internal notes, newest first. */
export async function listEnquiryNotes(
  enquiryId: string,
): Promise<EnquiryNote[]> {
  return db
    .select()
    .from(enquiryNotes)
    .where(eq(enquiryNotes.enquiryId, enquiryId))
    .orderBy(desc(enquiryNotes.createdAt));
}

/** Inserts an internal note for an enquiry and returns the created row. */
export async function addEnquiryNote(
  data: NewEnquiryNote,
): Promise<EnquiryNote> {
  const [row] = await db.insert(enquiryNotes).values(data).returning();
  return row;
}

/**
 * Deletes a note and returns the removed row, or `null` when it did not exist.
 */
export async function deleteEnquiryNote(
  id: string,
): Promise<EnquiryNote | null> {
  const [row] = await db
    .delete(enquiryNotes)
    .where(eq(enquiryNotes.id, id))
    .returning();
  return row ?? null;
}
