import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CalendarClient } from '@/components/admin/calendar/CalendarClient';
import { requireAdminPage } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import { getCalendarData } from '@/lib/db/repositories/calendar-admin.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';

export const metadata: Metadata = {
  title: 'Availability Calendar | Admin',
};

export default async function AdminCalendarPage() {
  const context = await requireAdminPage('calendar.view');

  const settings = await getHotelSettings();

  const timezone = settings?.timezone || 'Africa/Lagos';
  const { today } = hotelClock(new Date(), timezone);

  const initialData = await getCalendarData({
    from: today,
    days: 14,
  });

  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center text-muted-foreground">
          Loading calendar...
        </div>
      }
    >
      <CalendarClient initialData={initialData} role={context.role} />
    </Suspense>
  );
}
