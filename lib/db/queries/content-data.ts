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

export async function getHotelRow() {
  const [row] = await db
    .select()
    .from(hotelSettings)
    .where(eq(hotelSettings.id, 1))
    .limit(1);
  return row ?? null;
}

export async function getSocialLinkRows() {
  return db
    .select()
    .from(socialLinks)
    .where(eq(socialLinks.isActive, true))
    .orderBy(asc(socialLinks.sortOrder));
}

export async function getAmenityRows(): Promise<Amenity[]> {
  return db
    .select()
    .from(amenities)
    .where(eq(amenities.isActive, true))
    .orderBy(asc(amenities.sortOrder));
}

export async function getGalleryRows(): Promise<GalleryImage[]> {
  return db.select().from(galleryImages).orderBy(asc(galleryImages.sortOrder));
}

export async function getTestimonialRows(): Promise<Testimonial[]> {
  return db
    .select()
    .from(testimonials)
    .where(eq(testimonials.isActive, true))
    .orderBy(asc(testimonials.sortOrder));
}

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

export async function getBankAccountRows() {
  return db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.isActive, true))
    .orderBy(asc(bankAccounts.sortOrder));
}
