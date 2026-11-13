/**
 * Room-block persistence. Blocks use half-open date ranges, so a block ending
 * on the check-in date does not overlap that stay.
 */

import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { roomBlocks } from '@/db/schema';
import type { NewRoomBlock, RoomBlock } from '@/db/types';

/** Lists blocks for one room, or all blocks when no room is supplied. */
export async function listRoomBlocks(roomId?: string): Promise<RoomBlock[]> {
  if (roomId) {
    return db.select().from(roomBlocks).where(eq(roomBlocks.roomId, roomId));
  }
  return db.select().from(roomBlocks);
}

/** Loads a block by id. */
export async function getRoomBlockById(id: string): Promise<RoomBlock | null> {
  const [row] = await db
    .select()
    .from(roomBlocks)
    .where(eq(roomBlocks.id, id))
    .limit(1);
  return row ?? null;
}

/** Finds blocks that overlap the requested half-open date range. */
export async function findOverlappingRoomBlocks(
  roomId: string,
  startDate: string,
  endDate: string,
): Promise<RoomBlock[]> {
  return db
    .select()
    .from(roomBlocks)
    .where(
      and(
        eq(roomBlocks.roomId, roomId),
        sql`daterange(${roomBlocks.startDate}, ${roomBlocks.endDate}, '[)') && daterange(${startDate}::date, ${endDate}::date, '[)')`,
      ),
    );
}

/** Creates a room block and returns the inserted row. */
export async function createRoomBlock(data: NewRoomBlock): Promise<RoomBlock> {
  const [row] = await db.insert(roomBlocks).values(data).returning();
  return row;
}

/** Updates a block, refreshing `updatedAt`; null when it is missing. */
export async function updateRoomBlock(
  id: string,
  data: Partial<NewRoomBlock>,
): Promise<RoomBlock | null> {
  const [row] = await db
    .update(roomBlocks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(roomBlocks.id, id))
    .returning();
  return row ?? null;
}

/** Deletes a block and returns the removed row, or null. */
export async function deleteRoomBlock(id: string): Promise<RoomBlock | null> {
  const [row] = await db
    .delete(roomBlocks)
    .where(eq(roomBlocks.id, id))
    .returning();
  return row ?? null;
}
