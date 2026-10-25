import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { roomBlocks } from '@/db/schema';
import type { NewRoomBlock, RoomBlock } from '@/db/types';

export async function listRoomBlocks(roomId?: string): Promise<RoomBlock[]> {
  if (roomId) {
    return db.select().from(roomBlocks).where(eq(roomBlocks.roomId, roomId));
  }
  return db.select().from(roomBlocks);
}

export async function getRoomBlockById(id: string): Promise<RoomBlock | null> {
  const [row] = await db
    .select()
    .from(roomBlocks)
    .where(eq(roomBlocks.id, id))
    .limit(1);
  return row ?? null;
}

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

export async function createRoomBlock(data: NewRoomBlock): Promise<RoomBlock> {
  const [row] = await db.insert(roomBlocks).values(data).returning();
  return row;
}

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

export async function deleteRoomBlock(id: string): Promise<RoomBlock | null> {
  const [row] = await db
    .delete(roomBlocks)
    .where(eq(roomBlocks.id, id))
    .returning();
  return row ?? null;
}
