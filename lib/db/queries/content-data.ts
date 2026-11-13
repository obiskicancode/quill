/**
 * Read-only content queries for the public site: hotel settings, social links,
 * amenities, gallery, testimonials, room relations, and bank accounts.
 */

import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  amenities,
  bankAccounts,
  galleryImages,
  hotelSettings,
  roomTypeAmenities,
  roomTypes,
  socialLinks,
  testimonials,
} from '@/db/schema';
import type { Amenity, GalleryImage, RoomType, Testimonial } from '@/db/types';

import {
  mapRoomDetail,
  mapRoomType,
  type RoomRelations,
} from '../mappers/rooms.mapper';

/** Returns the singleton hotel settings row, or null when it is not seeded. */
export async function getHotelRow() {
  const [row] = await db
    .select()
    .from(hotelSettings)
    .where(eq(hotelSettings.id, 1))
    .limit(1);
  return row ?? null;
}

/** Returns active social links in display order. */
export async function getSocialLinkRows() {
  return db
    .select()
    .from(socialLinks)
    .where(eq(socialLinks.isActive, true))
    .orderBy(asc(socialLinks.sortOrder));
}

/** Returns active amenities in display order. */
export async function getAmenityRows(): Promise<Amenity[]> {
  return db
    .select()
    .from(amenities)
    .where(eq(amenities.isActive, true))
    .orderBy(asc(amenities.sortOrder));
}

/**
 * Returns all gallery images in display order; unlike the other getters this
 * does not filter on the active flag.
 */
export async function getGalleryRows(): Promise<GalleryImage[]> {
  return db.select().from(galleryImages).orderBy(asc(galleryImages.sortOrder));
}

/** Returns active testimonials in display order. */
export async function getTestimonialRows(): Promise<Testimonial[]> {
  return db
    .select()
    .from(testimonials)
    .where(eq(testimonials.isActive, true))
    .orderBy(asc(testimonials.sortOrder));
}

/**
 * Loads amenities, gallery images, testimonials, and room-amenity links, then
 * groups them by room type id. Rows without a room type id are skipped.
 */
export async function getRoomRelations(): Promise<RoomRelations> {
  const [amenityRows, galleryRows, testimonialRows, links] = await Promise.all([
    getAmenityRows(),
    getGalleryRows(),
    getTestimonialRows(),
    db.select().from(roomTypeAmenities),
  ]);
  const amenityById = new Map(amenityRows.map((a) => [a.id, a]));
  const amenitiesByRoom = new Map<string, Amenity[]>();
  for (const link of links) {
    const amenity = amenityById.get(link.amenityId);
    if (!amenity) continue;
    const list = amenitiesByRoom.get(link.roomTypeId) ?? [];
    list.push(amenity);
    amenitiesByRoom.set(link.roomTypeId, list);
  }
  const imagesByRoom = new Map<string, GalleryImage[]>();
  for (const image of galleryRows) {
    if (!image.roomTypeId) continue;
    const list = imagesByRoom.get(image.roomTypeId) ?? [];
    list.push(image);
    imagesByRoom.set(image.roomTypeId, list);
  }
  const testimonialsByRoom = new Map<string, Testimonial[]>();
  for (const testimonial of testimonialRows) {
    if (!testimonial.roomTypeId) continue;
    const list = testimonialsByRoom.get(testimonial.roomTypeId) ?? [];
    list.push(testimonial);
    testimonialsByRoom.set(testimonial.roomTypeId, list);
  }
  return {
    amenities: amenitiesByRoom,
    images: imagesByRoom,
    testimonials: testimonialsByRoom,
  };
}

/**
 * Returns active room types in display order with both public and detail
 * mappings sharing one set of room relations.
 */
export async function getRoomTypesWithDetails(): Promise<
  {
    row: RoomType;
    room: ReturnType<typeof mapRoomType>;
    detail: ReturnType<typeof mapRoomDetail>;
  }[]
> {
  const [rows, rel] = await Promise.all([
    db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.isActive, true))
      .orderBy(asc(roomTypes.sortOrder)),
    getRoomRelations(),
  ]);
  return rows.map((row) => ({
    row,
    room: mapRoomType(row, rel),
    detail: mapRoomDetail(row, rel),
  }));
}

/** Returns active bank accounts in display order. */
export async function getBankAccountRows() {
  return db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.isActive, true))
    .orderBy(asc(bankAccounts.sortOrder));
}
