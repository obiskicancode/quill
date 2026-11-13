/**
 * Amenity catalogue persistence: amenity CRUD plus the room-type ↔ amenity
 * association table used to describe what each room type offers.
 */

import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { amenities, roomTypeAmenities } from '@/db/schema';
import type {
  Amenity,
  NewAmenity,
  NewRoomTypeAmenity,
  RoomTypeAmenity,
} from '@/db/types';

/**
 * List amenities, optionally restricted to active ones (default). Pass
 * `false` to include inactive records for admin management.
 */
export async function listAmenities(activeOnly = true): Promise<Amenity[]> {
  if (activeOnly) {
    return db.select().from(amenities).where(eq(amenities.isActive, true));
  }
  return db.select().from(amenities);
}

/** Look up an amenity by its unique key, or `null` if none exists. */
export async function getAmenityByKey(key: string): Promise<Amenity | null> {
  const [row] = await db
    .select()
    .from(amenities)
    .where(eq(amenities.key, key))
    .limit(1);
  return row ?? null;
}

/** Look up an amenity by id, or `null` if none exists. */
export async function getAmenityById(id: string): Promise<Amenity | null> {
  const [row] = await db
    .select()
    .from(amenities)
    .where(eq(amenities.id, id))
    .limit(1);
  return row ?? null;
}

/** Insert a new amenity and return the created row. */
export async function createAmenity(data: NewAmenity): Promise<Amenity> {
  const [row] = await db.insert(amenities).values(data).returning();
  return row;
}

/** Update an amenity by id, returning `null` when the id does not exist. */
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

/** List the amenity associations for a single room type. */
export async function listAmenitiesForRoomType(
  roomTypeId: string,
): Promise<RoomTypeAmenity[]> {
  return db
    .select()
    .from(roomTypeAmenities)
    .where(eq(roomTypeAmenities.roomTypeId, roomTypeId));
}

/** Associate an amenity with a room type and return the new link row. */
export async function addAmenityToRoomType(
  data: NewRoomTypeAmenity,
): Promise<RoomTypeAmenity> {
  const [row] = await db.insert(roomTypeAmenities).values(data).returning();
  return row;
}

/**
 * Remove the room type ↔ amenity association, returning the deleted row or
 * `null` if no matching association existed.
 */
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
