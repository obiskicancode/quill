/**
 * Persistence helpers for notification templates, per-template recipients, and
 * the delivery log.
 */
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  notificationLogs,
  notificationRecipients,
  notificationTemplates,
} from '@/db/schema';
import type {
  NewNotificationLog,
  NewNotificationRecipient,
  NewNotificationTemplate,
  NotificationLog,
  NotificationRecipient,
  NotificationTemplate,
} from '@/db/types';

/** Lists templates, optionally limited to active ones. */
export async function listNotificationTemplates(
  activeOnly = false,
): Promise<NotificationTemplate[]> {
  if (activeOnly) {
    return db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.isActive, true));
  }
  return db.select().from(notificationTemplates);
}

/** Finds a template by its unique key, or `null` when absent. */
export async function getNotificationTemplateByKey(
  key: string,
): Promise<NotificationTemplate | null> {
  const [row] = await db
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.key, key))
    .limit(1);
  return row ?? null;
}

/** Inserts a template and returns the created row. */
export async function createNotificationTemplate(
  data: NewNotificationTemplate,
): Promise<NotificationTemplate> {
  const [row] = await db.insert(notificationTemplates).values(data).returning();
  return row;
}

/**
 * Partially updates a template, stamping `updatedAt`; returns `null` when no row
 * matched.
 */
export async function updateNotificationTemplate(
  id: string,
  data: Partial<NewNotificationTemplate>,
): Promise<NotificationTemplate | null> {
  const [row] = await db
    .update(notificationTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(notificationTemplates.id, id))
    .returning();
  return row ?? null;
}

/** Lists recipients, optionally filtered by template key. */
export async function listNotificationRecipients(
  templateKey?: string,
): Promise<NotificationRecipient[]> {
  if (templateKey) {
    return db
      .select()
      .from(notificationRecipients)
      .where(eq(notificationRecipients.templateKey, templateKey));
  }
  return db.select().from(notificationRecipients);
}

/** Inserts a recipient and returns the created row. */
export async function createNotificationRecipient(
  data: NewNotificationRecipient,
): Promise<NotificationRecipient> {
  const [row] = await db
    .insert(notificationRecipients)
    .values(data)
    .returning();
  return row;
}

/**
 * Partially updates a recipient, stamping `updatedAt`; returns `null` when no
 * row matched.
 */
export async function updateNotificationRecipient(
  id: string,
  data: Partial<NewNotificationRecipient>,
): Promise<NotificationRecipient | null> {
  const [row] = await db
    .update(notificationRecipients)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(notificationRecipients.id, id))
    .returning();
  return row ?? null;
}

/** Inserts a delivery-log entry and returns the created row. */
export async function createNotificationLog(
  data: NewNotificationLog,
): Promise<NotificationLog> {
  const [row] = await db.insert(notificationLogs).values(data).returning();
  return row;
}

/**
 * Lists delivery logs, newest first, optionally filtered by reservation.
 */
export async function listNotificationLogs(
  reservationId?: string,
): Promise<NotificationLog[]> {
  if (reservationId) {
    return db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.reservationId, reservationId))
      .orderBy(desc(notificationLogs.createdAt));
  }
  return db
    .select()
    .from(notificationLogs)
    .orderBy(desc(notificationLogs.createdAt));
}

/**
 * Partially updates a delivery log; returns `null` when no row matched. Unlike
 * the other update helpers here, it does not stamp an `updatedAt` value.
 */
export async function updateNotificationLog(
  id: string,
  data: Partial<NewNotificationLog>,
): Promise<NotificationLog | null> {
  const [row] = await db
    .update(notificationLogs)
    .set(data)
    .where(eq(notificationLogs.id, id))
    .returning();
  return row ?? null;
}
