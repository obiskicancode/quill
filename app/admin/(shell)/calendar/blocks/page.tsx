import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BlocksListClient } from '@/components/admin/calendar/BlocksListClient';
import { requireAdminPage } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import { getCalendarData } from '@/lib/db/repositories/calendar-admin.repo';
import { listRoomTypes } from '@/lib/db/repositories/rooms.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';

export const metadata: Metadata = {
  title: 'Room Blocks | Admin',
};

export default async function AdminCalendarBlocksPage() {
  const context = await requireAdminPage('calendar.view');

  const settings = await getHotelSettings();

  const timezone = settings?.timezone || 'Africa/Lagos';
  const { today } = hotelClock(new Date(), timezone);

  const { rooms: calendarRooms } = await getCalendarData({
    from: today,
    days: 1,
  });

  const allTypes = (await listRoomTypes(false)).map(({ id, name, slug }) => ({
    id,
    name,
    slug,
  }));

  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center text-muted-foreground">
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
