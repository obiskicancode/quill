import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { amenities, roomTypeAmenities } from '@/db/schema';
import type {
  Amenity,
  NewAmenity,
  NewRoomTypeAmenity,
  RoomTypeAmenity,
} from '@/db/types';

export async function listAmenities(activeOnly = true): Promise<Amenity[]> {
  if (activeOnly) {
    return db.select().from(amenities).where(eq(amenities.isActive, true));
  }
  return db.select().from(amenities);
}

export async function getAmenityByKey(key: string): Promise<Amenity | null> {
  const [row] = await db
    .select()
    .from(amenities)
    .where(eq(amenities.key, key))
    .limit(1);
  return row ?? null;
}

export async function getAmenityById(id: string): Promise<Amenity | null> {
  const [row] = await db
    .select()
    .from(amenities)
    .where(eq(amenities.id, id))
    .limit(1);
  return row ?? null;
}

export async function createAmenity(data: NewAmenity): Promise<Amenity> {
  const [row] = await db.insert(amenities).values(data).returning();
  return row;
}

export async function updateAmenity(
  id: string,
  data: Partial<NewAmenity>,
): Promise<Amenity | null> {
  const [row] = await db
    .update(amenities)
    .set(data)
    .where(eq(amenities.id, id))
    .returning();
  return row ?? null;
}

export async function listAmenitiesForRoomType(
  roomTypeId: string,
): Promise<RoomTypeAmenity[]> {
  return db
    .select()
    .from(roomTypeAmenities)
    .where(eq(roomTypeAmenities.roomTypeId, roomTypeId));
}

export async function addAmenityToRoomType(
  data: NewRoomTypeAmenity,
): Promise<RoomTypeAmenity> {
  const [row] = await db.insert(roomTypeAmenities).values(data).returning();
  return row;
}

export async function removeAmenityFromRoomType(
  roomTypeId: string,
  amenityId: string,
): Promise<RoomTypeAmenity | null> {
  const [row] = await db
    .delete(roomTypeAmenities)
    .where(
      and(
        eq(roomTypeAmenities.roomTypeId, roomTypeId),
        eq(roomTypeAmenities.amenityId, amenityId),
      ),
    )
    .returning();
  return row ?? null;
}
