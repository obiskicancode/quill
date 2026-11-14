import { eq, inArray } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

import {
  enquiries,
  enquiryNotes,
  enquiryReplies,
  extras,
  facilities,
  faqs,
  galleryImages,
  nearbyAttractions,
  notificationLogs,
  paymentProofs,
  payments,
  paymentWebhookEvents,
  rateRules,
  refunds,
  reservationExtras,
  reservationNights,
  reservations,
  reservationStatusHistory,
  roomBlocks,
  rooms,
  roomTypeAmenities,
  roomTypes,
  seedRecords,
  staffUsers,
  teamMembers,
  testimonials,
} from '@/db/schema';

import { removeDemoImages } from './demo-images';
import type { SeedExecutor } from './seed-records';

export interface ResetDemoResult {
  records: number;
  tables: number;
}

export async function runResetDemo(
  executor: SeedExecutor,
): Promise<ResetDemoResult> {
  const rows = await executor
    .select({ tableName: seedRecords.tableName, rowId: seedRecords.rowId })
    .from(seedRecords)
    .where(eq(seedRecords.seedName, 'demo'));

  const idsByTable = new Map<string, string[]>();
  for (const row of rows) {
    const ids = idsByTable.get(row.tableName) ?? [];
    ids.push(row.rowId);
    idsByTable.set(row.tableName, ids);
  }
  const ids = (tableName: string) => idsByTable.get(tableName) ?? [];

  const deleteById = async (
    tableName: string,
    table: PgTable & { id: PgColumn },
  ): Promise<void> => {
    const tableIds = ids(tableName);
    if (tableIds.length === 0) return;
    await executor.delete(table).where(inArray(table.id, tableIds));
  };

  await deleteById('notification_logs', notificationLogs);
  await deleteById('payment_webhook_events', paymentWebhookEvents);
  await deleteById('enquiry_replies', enquiryReplies);
  await deleteById('enquiry_notes', enquiryNotes);
  await deleteById('enquiries', enquiries);
  await deleteById('refunds', refunds);
  await deleteById('payment_proofs', paymentProofs);
  await deleteById('payments', payments);
  await deleteById('reservation_status_history', reservationStatusHistory);
  await deleteById('reservation_extras', reservationExtras);
  await deleteById('reservation_nights', reservationNights);
  await deleteById('reservations', reservations);
  await deleteById('room_blocks', roomBlocks);

  const demoRoomTypeIds = ids('room_types');
  if (demoRoomTypeIds.length > 0) {
    await executor
      .delete(roomTypeAmenities)
      .where(inArray(roomTypeAmenities.roomTypeId, demoRoomTypeIds));
  }

  await deleteById('gallery_images', galleryImages);
  await deleteById('testimonials', testimonials);
  await deleteById('nearby_attractions', nearbyAttractions);
  await deleteById('team_members', teamMembers);
  await deleteById('faqs', faqs);
  await deleteById('facilities', facilities);
  await deleteById('extras', extras);
  await deleteById('rate_rules', rateRules);
  await deleteById('rooms', rooms);
  await deleteById('room_types', roomTypes);
  await deleteById('staff_users', staffUsers);

  await executor.delete(seedRecords).where(eq(seedRecords.seedName, 'demo'));

  await removeDemoImages();

  return {
    records: rows.length,
    tables: idsByTable.size,
  };
}
