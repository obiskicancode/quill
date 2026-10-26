import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  amenities,
  extras,
  galleryImages,
  rateRules,
  reservationExtras,
  reservations,
  roomBlocks,
  rooms,
  roomTypeAmenities,
  roomTypes,
} from '@/db/schema';
import { addDays, todayISO } from '@/lib/dates';
import { createAuditLog } from '@/lib/db/repositories/audit.repo';
import { resolveNightlyRate, type RateRuleLike } from '@/lib/rate-resolution';
import type {
  AdminAmenity,
  AdminAmenityInput,
  AdminExtra,
  AdminExtraInput,
  AdminImageUpdate,
  AdminRateRule,
  AdminRateRuleInput,
  AdminRoomImage,
  AdminRoomTypeDetail,
  AdminRoomTypeInput,
  AdminRoomTypeListItem,
  AdminRoomUnit,
  AdminRoomUnitInput,
  PriceCalendarDay,
  RoomImpactCheckResponse,
} from '@/types/inventory.types';

// ==========================================
// 1. ROOM TYPES
// ==========================================

export async function listAdminRoomTypes(): Promise<AdminRoomTypeListItem[]> {
  const rows = await db
    .select({
      id: roomTypes.id,
      name: roomTypes.name,
      slug: roomTypes.slug,
      basePriceMinor: roomTypes.basePriceMinor,
      weekendPriceMinor: roomTypes.weekendPriceMinor,
      showPrice: roomTypes.showPrice,
      isActive: roomTypes.isActive,
      sortOrder: roomTypes.sortOrder,
      coverImageUrl: roomTypes.coverImageUrl,
      coverImageAlt: roomTypes.coverImageAlt,
      createdAt: roomTypes.createdAt,
      updatedAt: roomTypes.updatedAt,
      totalRooms: sql<number>`count(distinct ${rooms.id})::int`,
      activeRooms: sql<number>`count(distinct case when ${rooms.status} = 'active' and ${rooms.isActive} = true then ${rooms.id} end)::int`,
      photoCount: sql<number>`count(distinct ${galleryImages.id})::int`,
    })
    .from(roomTypes)
    .leftJoin(rooms, eq(rooms.roomTypeId, roomTypes.id))
    .leftJoin(
      galleryImages,
      and(
        eq(galleryImages.roomTypeId, roomTypes.id),
        eq(galleryImages.isActive, true),
      ),
    )
    .groupBy(roomTypes.id)
    .orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getAdminRoomTypeById(
  id: string,
): Promise<AdminRoomTypeDetail | null> {
  const [rt] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, id))
    .limit(1);

  if (!rt) return null;

  // 1. Photos
  const photos = await db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.roomTypeId, id))
    .orderBy(asc(galleryImages.sortOrder), asc(galleryImages.createdAt));

  // 2. Assigned Amenities
  const assignedAmenities = await db
    .select({ amenityId: roomTypeAmenities.amenityId })
    .from(roomTypeAmenities)
    .where(eq(roomTypeAmenities.roomTypeId, id));

  // 3. Room Units with next booking and block info
  const units = await db
    .select()
    .from(rooms)
    .where(eq(rooms.roomTypeId, id))
    .orderBy(asc(rooms.roomNumber));

  const today = todayISO();

  const populatedUnits: AdminRoomUnit[] = await Promise.all(
    units.map(async (u) => {
      // Find next upcoming reservation
      const [nextRes] = await db
        .select({
          id: reservations.id,
          reference: reservations.reference,
          guestName: reservations.guestName,
          checkIn: reservations.checkIn,
          checkOut: reservations.checkOut,
          status: reservations.status,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.roomId, u.id),
            inArray(reservations.status, [
              'pending',
              'confirmed',
              'checked_in',
            ]),
            sql`${reservations.checkOut} > ${today}::date`,
          ),
        )
        .orderBy(asc(reservations.checkIn))
        .limit(1);

      // Find next active or upcoming block
      const [nextBlk] = await db
        .select({
          id: roomBlocks.id,
          startDate: roomBlocks.startDate,
          endDate: roomBlocks.endDate,
          reason: roomBlocks.reason,
        })
        .from(roomBlocks)
        .where(
          and(
            eq(roomBlocks.roomId, u.id),
            sql`${roomBlocks.endDate} > ${today}::date`,
          ),
        )
        .orderBy(asc(roomBlocks.startDate))
        .limit(1);

      return {
        id: u.id,
        roomTypeId: u.roomTypeId,
        roomNumber: u.roomNumber,
        floor: u.floor,
        status: u.status,
        notes: u.notes,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        nextReservation: nextRes || null,
        nextBlock: nextBlk || null,
      };
    }),
  );

  // Check if room type has any booking history
  const [resCount] = await db
    .select({ count: count() })
    .from(reservations)
    .where(eq(reservations.roomTypeId, id));
  const hasBookingHistory = Number(resCount?.count ?? 0) > 0;

  return {
    ...rt,
    extraBedPriceMinor: rt.extraAdultPriceMinor,
    sizeSqm: rt.sizeSqm ? Number(rt.sizeSqm) : null,
    createdAt: rt.createdAt.toISOString(),
    updatedAt: rt.updatedAt.toISOString(),
    photos: photos.map((p) => ({
      id: p.id,
      roomTypeId: p.roomTypeId,
      category: p.category,
      imageUrl: p.imageUrl,
      thumbnailUrl: p.thumbnailUrl,
      blurDataUrl: p.blurDataUrl,
      altText: p.altText,
      caption: p.caption,
      width: p.width,
      height: p.height,
      sortOrder: p.sortOrder,
      isActive: p.isActive,
      isCover: rt.coverImageUrl === p.imageUrl,
    })),
    amenityIds: assignedAmenities.map((a) => a.amenityId),
    rooms: populatedUnits,
    hasBookingHistory,
  };
}

export async function createAdminRoomType(params: {
  input: AdminRoomTypeInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<AdminRoomTypeListItem> {
  const { input, actorId, actorRole, ipAddress } = params;

  // Verify unique slug
  const [existingSlug] = await db
    .select({ id: roomTypes.id })
    .from(roomTypes)
    .where(eq(roomTypes.slug, input.slug))
    .limit(1);

  if (existingSlug) {
    throw new Error(`A room type with slug "${input.slug}" already exists.`);
  }

  // Get max sort order
  const [maxOrder] = await db
    .select({ max: sql<number>`coalesce(max(${roomTypes.sortOrder}), 0)::int` })
    .from(roomTypes);
  const nextOrder = (maxOrder?.max ?? 0) + 1;

  const [created] = await db
    .insert(roomTypes)
    .values({
      name: input.name,
      slug: input.slug,
      description: input.description,
      shortDescription: input.shortDescription,
      bedConfig: input.bedConfig,
      sizeSqm: input.sizeSqm ? String(input.sizeSqm) : null,
      maxAdults: input.maxAdults,
      maxChildren: input.maxChildren,
      maxOccupancy: input.maxAdults + input.maxChildren,
      extraBedAvailable: input.extraBedAvailable,
      extraAdultPriceMinor: input.extraBedPriceMinor ?? 0,
      basePriceMinor: input.basePriceMinor,
      weekendPriceMinor: input.weekendPriceMinor,
      showPrice: input.showPrice,
      breakfastIncluded: input.breakfastIncluded,
      viewNotes: input.viewNotes,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      isActive: input.isActive,
      sortOrder: nextOrder,
    })
    .returning();

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'room_type',
    entityId: created.id,
    action: 'create',
    changes: input,
    ipAddress,
  });

  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    basePriceMinor: created.basePriceMinor,
    weekendPriceMinor: created.weekendPriceMinor,
    showPrice: created.showPrice,
    isActive: created.isActive,
    sortOrder: created.sortOrder,
    coverImageUrl: created.coverImageUrl,
    coverImageAlt: created.coverImageAlt,
    totalRooms: 0,
    activeRooms: 0,
    photoCount: 0,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function updateAdminRoomTypeDetails(params: {
  id: string;
  input: AdminRoomTypeInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, input, actorId, actorRole, ipAddress } = params;

  const [existing] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('Room type not found');
  }

  // If slug is changing
  if (existing.slug !== input.slug) {
    const [slugConflict] = await db
      .select({ id: roomTypes.id })
      .from(roomTypes)
      .where(and(eq(roomTypes.slug, input.slug), sql`${roomTypes.id} != ${id}`))
      .limit(1);

    if (slugConflict) {
      throw new Error(
        `Slug "${input.slug}" is already in use by another room type.`,
      );
    }

    if (existing.isActive && !input.unlockSlugConfirmed) {
      throw new Error(
        'Changing the slug of an active room type breaks public URLs. Please confirm slug unlock.',
      );
    }
  }

  // If activating room type, check photos have alt text
  if (!existing.isActive && input.isActive) {
    const photos = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.roomTypeId, id));
    const missingAlt = photos.some(
      (p) => !p.altText || p.altText.trim() === '',
    );
    if (photos.length > 0 && missingAlt) {
      throw new Error(
        'Every uploaded photo must have descriptive alt text before this room type can be published.',
      );
    }
  }

  await db
    .update(roomTypes)
    .set({
      name: input.name,
      slug: input.slug,
      description: input.description,
      shortDescription: input.shortDescription,
      bedConfig: input.bedConfig,
      sizeSqm: input.sizeSqm ? String(input.sizeSqm) : null,
      maxAdults: input.maxAdults,
      maxChildren: input.maxChildren,
      maxOccupancy: input.maxAdults + input.maxChildren,
      extraBedAvailable: input.extraBedAvailable,
      extraAdultPriceMinor: input.extraBedPriceMinor ?? 0,
      basePriceMinor: input.basePriceMinor,
      weekendPriceMinor: input.weekendPriceMinor,
      showPrice: input.showPrice,
      breakfastIncluded: input.breakfastIncluded,
      viewNotes: input.viewNotes,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(roomTypes.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'room_type',
    entityId: id,
    action: 'update_details',
    changes: {
      before: {
        basePriceMinor: existing.basePriceMinor,
        weekendPriceMinor: existing.weekendPriceMinor,
        isActive: existing.isActive,
        slug: existing.slug,
      },
      after: {
        basePriceMinor: input.basePriceMinor,
        weekendPriceMinor: input.weekendPriceMinor,
        isActive: input.isActive,
        slug: input.slug,
      },
    },
    ipAddress,
  });
}

export async function deleteAdminRoomType(params: {
  id: string;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, actorId, actorRole, ipAddress } = params;

  // Check booking history
  const [resCount] = await db
    .select({ count: count() })
    .from(reservations)
    .where(eq(reservations.roomTypeId, id));

  if (Number(resCount?.count ?? 0) > 0) {
    throw new Error(
      'This room type has booking history and cannot be deleted. Deactivate it instead so it is hidden from guests.',
    );
  }

  // Delete units, image references, amenity links, then room type
  await db.delete(rooms).where(eq(rooms.roomTypeId, id));
  await db.delete(galleryImages).where(eq(galleryImages.roomTypeId, id));
  await db
    .delete(roomTypeAmenities)
    .where(eq(roomTypeAmenities.roomTypeId, id));
  await db.delete(rateRules).where(eq(rateRules.roomTypeId, id));
  await db.delete(roomTypes).where(eq(roomTypes.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'room_type',
    entityId: id,
    action: 'delete',
    ipAddress,
  });
}

export async function reorderRoomTypes(
  items: Array<{ id: string; sortOrder: number }>,
  actorId?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(roomTypes)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(eq(roomTypes.id, item.id));
    }
  });

  await createAuditLog({
    actorId,
    entity: 'room_types',
    entityId: 'reorder',
    action: 'reorder',
    changes: items,
  });
}

// ==========================================
// 2. ROOM PHOTOS & AMENITIES
// ==========================================

export async function addRoomTypeImage(params: {
  roomTypeId: string;
  imageUrl: string;
  thumbnailUrl: string;
  blurDataUrl: string;
  width: number;
  height: number;
  altText: string;
  caption?: string;
  isCover?: boolean;
}): Promise<AdminRoomImage> {
  const {
    roomTypeId,
    imageUrl,
    thumbnailUrl,
    blurDataUrl,
    width,
    height,
    altText,
    caption,
    isCover,
  } = params;

  // Enforce max 8 images
  const [imgCount] = await db
    .select({ count: count() })
    .from(galleryImages)
    .where(eq(galleryImages.roomTypeId, roomTypeId));

  if (Number(imgCount?.count ?? 0) >= 8) {
    throw new Error('A room type can have a maximum of 8 photos.');
  }

  const [maxOrder] = await db
    .select({
      max: sql<number>`coalesce(max(${galleryImages.sortOrder}), 0)::int`,
    })
    .from(galleryImages)
    .where(eq(galleryImages.roomTypeId, roomTypeId));
  const sortOrder = (maxOrder?.max ?? 0) + 1;

  const [image] = await db
    .insert(galleryImages)
    .values({
      category: 'rooms',
      roomTypeId,
      imageUrl,
      thumbnailUrl,
      blurDataUrl,
      width,
      height,
      altText,
      caption,
      sortOrder,
      isActive: true,
    })
    .returning();

  // If isCover or if this is the first image, set as roomType cover
  if (isCover || Number(imgCount?.count ?? 0) === 0) {
    await db
      .update(roomTypes)
      .set({
        coverImageUrl: imageUrl,
        coverImageAlt: altText,
        updatedAt: new Date(),
      })
      .where(eq(roomTypes.id, roomTypeId));
  }

  return {
    id: image.id,
    roomTypeId: image.roomTypeId,
    category: image.category,
    imageUrl: image.imageUrl,
    thumbnailUrl: image.thumbnailUrl,
    blurDataUrl: image.blurDataUrl,
    altText: image.altText,
    caption: image.caption,
    width: image.width,
    height: image.height,
    sortOrder: image.sortOrder,
    isActive: image.isActive,
    isCover: isCover || Number(imgCount?.count ?? 0) === 0,
  };
}

export async function updateImageDetails(
  imageId: string,
  input: AdminImageUpdate,
): Promise<void> {
  const [img] = await db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.id, imageId))
    .limit(1);

  if (!img) throw new Error('Image not found');

  await db
    .update(galleryImages)
    .set({
      altText: input.altText,
      caption: input.caption,
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(galleryImages.id, imageId));

  if (input.isCover && img.roomTypeId) {
    await db
      .update(roomTypes)
      .set({
        coverImageUrl: img.imageUrl,
        coverImageAlt: input.altText,
        updatedAt: new Date(),
      })
      .where(eq(roomTypes.id, img.roomTypeId));
  }
}

export async function deleteRoomTypeImage(imageId: string): Promise<void> {
  const [img] = await db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.id, imageId))
    .limit(1);

  if (!img) return;

  await db.delete(galleryImages).where(eq(galleryImages.id, imageId));

  if (img.roomTypeId) {
    // Check if it was cover image
    const [rt] = await db
      .select({ coverImageUrl: roomTypes.coverImageUrl })
      .from(roomTypes)
      .where(eq(roomTypes.id, img.roomTypeId))
      .limit(1);

    if (rt?.coverImageUrl === img.imageUrl) {
      // Pick next photo or set to null
      const [nextPhoto] = await db
        .select()
        .from(galleryImages)
        .where(eq(galleryImages.roomTypeId, img.roomTypeId))
        .orderBy(asc(galleryImages.sortOrder))
        .limit(1);

      await db
        .update(roomTypes)
        .set({
          coverImageUrl: nextPhoto?.imageUrl || null,
          coverImageAlt: nextPhoto?.altText || null,
          updatedAt: new Date(),
        })
        .where(eq(roomTypes.id, img.roomTypeId));
    }
  }
}

export async function reorderRoomTypeImages(
  roomTypeId: string,
  items: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(galleryImages)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(
          and(
            eq(galleryImages.id, item.id),
            eq(galleryImages.roomTypeId, roomTypeId),
          ),
        );
    }
  });
}

export async function updateRoomTypeAmenities(
  roomTypeId: string,
  amenityIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(roomTypeAmenities)
      .where(eq(roomTypeAmenities.roomTypeId, roomTypeId));

    if (amenityIds.length > 0) {
      await tx.insert(roomTypeAmenities).values(
        amenityIds.map((id) => ({
          roomTypeId,
          amenityId: id,
        })),
      );
    }
  });
}

// ==========================================
// 3. ROOM UNITS & IMPACT CHECK
// ==========================================

export async function checkRoomStatusImpact(
  roomId: string,
): Promise<RoomImpactCheckResponse> {
  const today = todayISO();

  // Look up future/active reservations
  const activeReservations = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      guestName: reservations.guestName,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
      status: reservations.status,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.roomId, roomId),
        inArray(reservations.status, ['pending', 'confirmed', 'checked_in']),
        sql`${reservations.checkOut} > ${today}::date`,
      ),
    )
    .orderBy(asc(reservations.checkIn));

  // Look up active/future blocks
  const activeBlocks = await db
    .select({
      id: roomBlocks.id,
      startDate: roomBlocks.startDate,
      endDate: roomBlocks.endDate,
      reason: roomBlocks.reason,
      notes: roomBlocks.notes,
    })
    .from(roomBlocks)
    .where(
      and(
        eq(roomBlocks.roomId, roomId),
        sql`${roomBlocks.endDate} > ${today}::date`,
      ),
    )
    .orderBy(asc(roomBlocks.startDate));

  const hasImpact = activeReservations.length > 0 || activeBlocks.length > 0;

  return {
    hasImpact,
    canChangeStatus: !hasImpact,
    reservations: activeReservations,
    blocks: activeBlocks,
  };
}

export async function createAdminRoom(params: {
  roomTypeId: string;
  input: AdminRoomUnitInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<AdminRoomUnit> {
  const { roomTypeId, input, actorId, actorRole, ipAddress } = params;

  // Check unique roomNumber
  const [existing] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.roomNumber, input.roomNumber))
    .limit(1);

  if (existing) {
    throw new Error(`Room number "${input.roomNumber}" already exists.`);
  }

  const [unit] = await db
    .insert(rooms)
    .values({
      roomTypeId,
      roomNumber: input.roomNumber,
      floor: input.floor,
      status: input.status,
      notes: input.notes,
      isActive: input.isActive,
    })
    .returning();

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'room',
    entityId: unit.id,
    action: 'create',
    changes: input,
    ipAddress,
  });

  return {
    id: unit.id,
    roomTypeId: unit.roomTypeId,
    roomNumber: unit.roomNumber,
    floor: unit.floor,
    status: unit.status,
    notes: unit.notes,
    isActive: unit.isActive,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
  };
}

export async function updateAdminRoom(params: {
  id: string;
  input: AdminRoomUnitInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, input, actorId, actorRole, ipAddress } = params;

  const [existing] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, id))
    .limit(1);

  if (!existing) throw new Error('Room not found');

  // Check room number uniqueness if changing
  if (existing.roomNumber !== input.roomNumber) {
    const [conflict] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(
        and(eq(rooms.roomNumber, input.roomNumber), sql`${rooms.id} != ${id}`),
      )
      .limit(1);

    if (conflict) {
      throw new Error(`Room number "${input.roomNumber}" is already in use.`);
    }
  }

  // If changing status to maintenance or inactive, run impact check
  if (
    (input.status === 'maintenance' || input.status === 'inactive') &&
    existing.status !== input.status
  ) {
    const impact = await checkRoomStatusImpact(id);
    if (impact.hasImpact) {
      const resCount = impact.reservations.length;
      const blkCount = impact.blocks.length;
      throw new Error(
        `Cannot change status to "${input.status}". Room has ${resCount} upcoming reservation(s) and ${blkCount} active block(s). Please reassign bookings or remove blocks first.`,
      );
    }
  }

  await db
    .update(rooms)
    .set({
      roomNumber: input.roomNumber,
      floor: input.floor,
      status: input.status,
      notes: input.notes,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(rooms.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'room',
    entityId: id,
    action: 'update',
    changes: {
      before: { status: existing.status, roomNumber: existing.roomNumber },
      after: { status: input.status, roomNumber: input.roomNumber },
    },
    ipAddress,
  });
}

export async function deleteAdminRoom(params: {
  id: string;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, actorId, actorRole, ipAddress } = params;

  // Check if any reservation has ever used this room
  const [resCount] = await db
    .select({ count: count() })
    .from(reservations)
    .where(eq(reservations.roomId, id));

  if (Number(resCount?.count ?? 0) > 0) {
    throw new Error(
      'This room has past or upcoming reservations and cannot be deleted. Change its status to "inactive" instead.',
    );
  }

  // Delete any blocks on this room
  await db.delete(roomBlocks).where(eq(roomBlocks.roomId, id));
  await db.delete(rooms).where(eq(rooms.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'room',
    entityId: id,
    action: 'delete',
    ipAddress,
  });
}

// ==========================================
// 4. RATE RULES & PRICING PREVIEW
// ==========================================

export async function listAdminRateRules(
  roomTypeId?: string,
): Promise<AdminRateRule[]> {
  const conditions = [];
  if (roomTypeId) {
    conditions.push(
      sql`(${rateRules.roomTypeId} = ${roomTypeId}::uuid OR ${rateRules.roomTypeId} IS NULL)`,
    );
  }

  const rows = await db
    .select({
      id: rateRules.id,
      roomTypeId: rateRules.roomTypeId,
      roomTypeName: roomTypes.name,
      name: rateRules.name,
      startDate: rateRules.startDate,
      endDate: rateRules.endDate,
      minNights: rateRules.minNights,
      maxNights: rateRules.maxNights,
      daysOfWeek: rateRules.daysOfWeek,
      adjustmentType: rateRules.adjustmentType,
      adjustmentValue: rateRules.adjustmentValue,
      priority: rateRules.priority,
      isActive: rateRules.isActive,
      createdAt: rateRules.createdAt,
      updatedAt: rateRules.updatedAt,
    })
    .from(rateRules)
    .leftJoin(roomTypes, eq(rateRules.roomTypeId, roomTypes.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(rateRules.startDate), desc(rateRules.priority));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createAdminRateRule(params: {
  input: AdminRateRuleInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<AdminRateRule> {
  const { input, actorId, actorRole, ipAddress } = params;

  const [rule] = await db
    .insert(rateRules)
    .values({
      name: input.name,
      roomTypeId: input.roomTypeId || null,
      startDate: input.startDate,
      endDate: input.endDate,
      daysOfWeek: input.daysOfWeek || null,
      adjustmentType: input.adjustmentType,
      adjustmentValue: input.adjustmentValue,
      minNights: input.minNights || null,
      maxNights: input.maxNights || null,
      priority: input.priority ?? 0,
      isActive: input.isActive,
    })
    .returning();

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'rate_rule',
    entityId: rule.id,
    action: 'create',
    changes: input,
    ipAddress,
  });

  let roomTypeName: string | null = null;
  if (rule.roomTypeId) {
    const [rt] = await db
      .select({ name: roomTypes.name })
      .from(roomTypes)
      .where(eq(roomTypes.id, rule.roomTypeId))
      .limit(1);
    roomTypeName = rt?.name ?? null;
  }

  return {
    ...rule,
    roomTypeName,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export async function updateAdminRateRule(params: {
  id: string;
  input: AdminRateRuleInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, input, actorId, actorRole, ipAddress } = params;

  const [existing] = await db
    .select()
    .from(rateRules)
    .where(eq(rateRules.id, id))
    .limit(1);

  if (!existing) throw new Error('Rate rule not found');

  await db
    .update(rateRules)
    .set({
      name: input.name,
      roomTypeId: input.roomTypeId || null,
      startDate: input.startDate,
      endDate: input.endDate,
      daysOfWeek: input.daysOfWeek || null,
      adjustmentType: input.adjustmentType,
      adjustmentValue: input.adjustmentValue,
      minNights: input.minNights || null,
      maxNights: input.maxNights || null,
      priority: input.priority ?? 0,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(rateRules.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'rate_rule',
    entityId: id,
    action: 'update',
    changes: { before: existing, after: input },
    ipAddress,
  });
}

export async function deleteAdminRateRule(params: {
  id: string;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, actorId, actorRole, ipAddress } = params;
  await db.delete(rateRules).where(eq(rateRules.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'rate_rule',
    entityId: id,
    action: 'delete',
    ipAddress,
  });
}

export async function checkRateRuleOverlap(input: AdminRateRuleInput): Promise<{
  hasOverlap: boolean;
  conflicts: Array<{
    id: string;
    name: string;
    priority: number;
    startDate: string;
    endDate: string;
    equalPriority: boolean;
  }>;
}> {
  const overlapping = await db
    .select({
      id: rateRules.id,
      name: rateRules.name,
      priority: rateRules.priority,
      startDate: rateRules.startDate,
      endDate: rateRules.endDate,
      roomTypeId: rateRules.roomTypeId,
    })
    .from(rateRules)
    .where(
      and(
        eq(rateRules.isActive, true),
        sql`${rateRules.startDate} <= ${input.endDate}::date`,
        sql`${rateRules.endDate} >= ${input.startDate}::date`,
        input.roomTypeId
          ? sql`(${rateRules.roomTypeId} = ${input.roomTypeId}::uuid OR ${rateRules.roomTypeId} IS NULL)`
          : sql`true`,
      ),
    );

  const conflicts = overlapping.map((r) => ({
    id: r.id,
    name: r.name,
    priority: r.priority,
    startDate: r.startDate,
    endDate: r.endDate,
    equalPriority: r.priority === input.priority,
  }));

  return {
    hasOverlap: conflicts.length > 0,
    conflicts,
  };
}

export async function getPricingCalendar(params: {
  roomTypeId: string;
  startDate: string;
  days?: number;
}): Promise<PriceCalendarDay[]> {
  const { roomTypeId, startDate, days = 90 } = params;

  const [rt] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, roomTypeId))
    .limit(1);

  if (!rt) throw new Error('Room type not found');

  const activeRulesRaw = await db
    .select()
    .from(rateRules)
    .where(
      and(
        eq(rateRules.isActive, true),
        sql`(${rateRules.roomTypeId} = ${roomTypeId}::uuid OR ${rateRules.roomTypeId} IS NULL)`,
      ),
    );

  const activeRules: RateRuleLike[] = activeRulesRaw.map((r) => ({
    id: r.id,
    roomTypeId: r.roomTypeId,
    name: r.name,
    startDate: r.startDate,
    endDate: r.endDate,
    minNights: r.minNights,
    maxNights: r.maxNights,
    daysOfWeek: r.daysOfWeek,
    adjustmentType: r.adjustmentType,
    adjustmentValue: r.adjustmentValue,
    priority: r.priority,
    isActive: r.isActive,
  }));

  const result: PriceCalendarDay[] = [];

  for (let i = 0; i < days; i++) {
    const curDate = addDays(startDate, i);
    const resolution = resolveNightlyRate({
      roomTypeId,
      date: curDate,
      basePriceMinor: rt.basePriceMinor,
      weekendPriceMinor: rt.weekendPriceMinor,
      activeRules,
    });

    result.push({
      date: curDate,
      baseRateMinor: resolution.baseRateMinor,
      resolvedRateMinor: resolution.resolvedRateMinor,
      isWeekend: resolution.isWeekend,
      winningRule: resolution.winningRule,
    });
  }

  return result;
}

// ==========================================
// 5. EXTRAS
// ==========================================

export async function listAdminExtras(): Promise<AdminExtra[]> {
  const rows = await db
    .select({
      id: extras.id,
      name: extras.name,
      slug: extras.slug,
      description: extras.description,
      priceMinor: extras.priceMinor,
      maxQuantity: extras.maxQuantity,
      pricingUnit: extras.pricingUnit,
      isActive: extras.isActive,
      sortOrder: extras.sortOrder,
      createdAt: extras.createdAt,
      updatedAt: extras.updatedAt,
      resCount: sql<number>`count(distinct ${reservationExtras.id})::int`,
    })
    .from(extras)
    .leftJoin(reservationExtras, eq(reservationExtras.extraId, extras.id))
    .groupBy(extras.id)
    .orderBy(asc(extras.sortOrder), asc(extras.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    priceMinor: r.priceMinor,
    maxQuantity: r.maxQuantity,
    pricingUnit: r.pricingUnit,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    hasReservations: r.resCount > 0,
  }));
}

export async function createAdminExtra(params: {
  input: AdminExtraInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<AdminExtra> {
  const { input, actorId, actorRole, ipAddress } = params;

  const [existing] = await db
    .select({ id: extras.id })
    .from(extras)
    .where(eq(extras.slug, input.slug))
    .limit(1);

  if (existing) {
    throw new Error(`An extra with slug "${input.slug}" already exists.`);
  }

  const [maxOrder] = await db
    .select({ max: sql<number>`coalesce(max(${extras.sortOrder}), 0)::int` })
    .from(extras);
  const nextOrder = (maxOrder?.max ?? 0) + 1;

  const [created] = await db
    .insert(extras)
    .values({
      name: input.name,
      slug: input.slug,
      description: input.description,
      priceMinor: input.priceMinor,
      maxQuantity: input.maxQuantity,
      pricingUnit: input.pricingUnit,
      isActive: input.isActive,
      sortOrder: input.sortOrder ?? nextOrder,
    })
    .returning();

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'extra',
    entityId: created.id,
    action: 'create',
    changes: input,
    ipAddress,
  });

  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    hasReservations: false,
  };
}

export async function updateAdminExtra(params: {
  id: string;
  input: AdminExtraInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, input, actorId, actorRole, ipAddress } = params;

  const [existing] = await db
    .select()
    .from(extras)
    .where(eq(extras.id, id))
    .limit(1);

  if (!existing) throw new Error('Extra not found');

  if (existing.slug !== input.slug) {
    const [conflict] = await db
      .select({ id: extras.id })
      .from(extras)
      .where(and(eq(extras.slug, input.slug), sql`${extras.id} != ${id}`))
      .limit(1);

    if (conflict) {
      throw new Error(
        `Slug "${input.slug}" is already in use by another extra.`,
      );
    }
  }

  await db
    .update(extras)
    .set({
      name: input.name,
      slug: input.slug,
      description: input.description,
      priceMinor: input.priceMinor,
      maxQuantity: input.maxQuantity,
      pricingUnit: input.pricingUnit,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(extras.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'extra',
    entityId: id,
    action: 'update',
    changes: { before: existing, after: input },
    ipAddress,
  });
}

export async function deleteAdminExtra(params: {
  id: string;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, actorId, actorRole, ipAddress } = params;

  // Check if ever used in reservation extras
  const [resCount] = await db
    .select({ count: count() })
    .from(reservationExtras)
    .where(eq(reservationExtras.extraId, id));

  if (Number(resCount?.count ?? 0) > 0) {
    throw new Error(
      'This extra has been booked in existing reservations and cannot be deleted. Deactivate it instead so it is no longer offered.',
    );
  }

  await db.delete(extras).where(eq(extras.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'extra',
    entityId: id,
    action: 'delete',
    ipAddress,
  });
}

export async function reorderExtras(
  items: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(extras)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(eq(extras.id, item.id));
    }
  });
}

// ==========================================
// 6. AMENITIES
// ==========================================

export async function listAdminAmenitiesWithUsage(): Promise<AdminAmenity[]> {
  const rows = await db
    .select({
      id: amenities.id,
      key: amenities.key,
      label: amenities.label,
      icon: amenities.icon,
      description: amenities.description,
      sortOrder: amenities.sortOrder,
      isActive: amenities.isActive,
      createdAt: amenities.createdAt,
      usageCount: sql<number>`count(distinct ${roomTypeAmenities.roomTypeId})::int`,
    })
    .from(amenities)
    .leftJoin(roomTypeAmenities, eq(roomTypeAmenities.amenityId, amenities.id))
    .groupBy(amenities.id)
    .orderBy(asc(amenities.sortOrder), asc(amenities.label));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createAdminAmenity(params: {
  input: AdminAmenityInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<AdminAmenity> {
  const { input, actorId, actorRole, ipAddress } = params;

  const [existing] = await db
    .select({ id: amenities.id })
    .from(amenities)
    .where(eq(amenities.key, input.key))
    .limit(1);

  if (existing) {
    throw new Error(`An amenity with key "${input.key}" already exists.`);
  }

  const [maxOrder] = await db
    .select({ max: sql<number>`coalesce(max(${amenities.sortOrder}), 0)::int` })
    .from(amenities);
  const nextOrder = (maxOrder?.max ?? 0) + 1;

  const [created] = await db
    .insert(amenities)
    .values({
      key: input.key,
      label: input.label,
      icon: input.icon,
      description: input.description,
      sortOrder: input.sortOrder ?? nextOrder,
      isActive: input.isActive,
    })
    .returning();

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'amenity',
    entityId: created.id,
    action: 'create',
    changes: input,
    ipAddress,
  });

  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
    usageCount: 0,
  };
}

export async function updateAdminAmenity(params: {
  id: string;
  input: AdminAmenityInput;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, input, actorId, actorRole, ipAddress } = params;

  const [existing] = await db
    .select()
    .from(amenities)
    .where(eq(amenities.id, id))
    .limit(1);

  if (!existing) throw new Error('Amenity not found');

  if (existing.key !== input.key) {
    const [conflict] = await db
      .select({ id: amenities.id })
      .from(amenities)
      .where(and(eq(amenities.key, input.key), sql`${amenities.id} != ${id}`))
      .limit(1);

    if (conflict) {
      throw new Error(`Amenity key "${input.key}" is already in use.`);
    }
  }

  await db
    .update(amenities)
    .set({
      key: input.key,
      label: input.label,
      icon: input.icon,
      description: input.description,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    })
    .where(eq(amenities.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'amenity',
    entityId: id,
    action: 'update',
    changes: { before: existing, after: input },
    ipAddress,
  });
}

export async function deleteAdminAmenity(params: {
  id: string;
  actorId?: string;
  actorRole?: 'owner' | 'manager' | 'reception';
  ipAddress?: string;
}): Promise<void> {
  const { id, actorId, actorRole, ipAddress } = params;

  // Check if assigned to any room types
  const assigned = await db
    .select({
      roomTypeId: roomTypeAmenities.roomTypeId,
      roomTypeName: roomTypes.name,
    })
    .from(roomTypeAmenities)
    .innerJoin(roomTypes, eq(roomTypes.id, roomTypeAmenities.roomTypeId))
    .where(eq(roomTypeAmenities.amenityId, id));

  if (assigned.length > 0) {
    const names = assigned.map((a) => a.roomTypeName).join(', ');
    throw new Error(
      `Cannot delete this amenity because it is assigned to: ${names}. Remove it from these room types first.`,
    );
  }

  await db.delete(amenities).where(eq(amenities.id, id));

  await createAuditLog({
    actorId,
    actorRole,
    entity: 'amenity',
    entityId: id,
    action: 'delete',
    ipAddress,
  });
}

export async function reorderAmenities(
  items: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(amenities)
        .set({ sortOrder: item.sortOrder })
        .where(eq(amenities.id, item.id));
    }
  });
}
