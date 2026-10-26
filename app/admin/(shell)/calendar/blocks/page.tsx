import { asc, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BlocksListClient } from '@/components/admin/calendar/BlocksListClient';
import { db } from '@/db';
import { hotelSettings, rooms, roomTypes } from '@/db/schema';
import { requireAdminPage } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import type { CalendarRoom } from '@/types/calendar.types';

export const metadata: Metadata = {
  title: 'Room Blocks | Admin',
};

export default async function AdminCalendarBlocksPage() {
  const context = await requireAdminPage('calendar.view');

  const [settings] = await db
    .select({ timezone: hotelSettings.timezone })
    .from(hotelSettings)
    .limit(1);

  const timezone = settings?.timezone || 'Africa/Lagos';
  const { today } = hotelClock(new Date(), timezone);

  const rawRooms = await db
    .select({
      id: rooms.id,
      roomNumber: rooms.roomNumber,
      floor: rooms.floor,
      status: rooms.status,
      roomTypeId: rooms.roomTypeId,
      roomTypeName: roomTypes.name,
      roomTypeSlug: roomTypes.slug,
      sortOrder: roomTypes.sortOrder,
    })
    .from(rooms)
    .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
    .orderBy(asc(roomTypes.sortOrder), asc(rooms.roomNumber));

  const calendarRooms: CalendarRoom[] = rawRooms.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    floor: r.floor,
    status: r.status as 'active' | 'maintenance' | 'inactive',
    roomTypeId: r.roomTypeId,
    roomTypeName: r.roomTypeName,
    roomTypeSlug: r.roomTypeSlug,
    sortOrder: r.sortOrder,
  }));

  const allTypes = await db
    .select({
      id: roomTypes.id,
      name: roomTypes.name,
      slug: roomTypes.slug,
    })
    .from(roomTypes)
    .orderBy(asc(roomTypes.sortOrder));

  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex h-96 items-center justify-center">
          Loading room blocks...
        </div>
      }
    >
      <BlocksListClient
        initialRooms={calendarRooms}
        initialRoomTypes={allTypes}
        role={context.role}
        today={today}
      />
    </Suspense>
  );
}
