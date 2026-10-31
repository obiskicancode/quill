import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import { hotelSettings } from '@/db/schema';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import { getCalendarData } from '@/lib/db/repositories/calendar-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { calendarQuerySchema } from '@/schemas/calendar.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.view',
  });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = calendarQuerySchema.safeParse({
    from: url.searchParams.get('from') || undefined,
    days: url.searchParams.get('days') || undefined,
    roomTypeId: url.searchParams.get('roomTypeId') || undefined,
  });

  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_CALENDAR_QUERY,
      parsed.error.flatten(),
    );
  }

  const [settings] = await db
    .select({ timezone: hotelSettings.timezone })
    .from(hotelSettings)
    .limit(1);
  const timezone = settings?.timezone || 'Africa/Lagos';
  const { today } = hotelClock(new Date(), timezone);

  const from = parsed.data.from || today;
  const days = parsed.data.days;
  const roomTypeId = parsed.data.roomTypeId;

  try {
    const calendar = await getCalendarData({
      from,
      days,
      roomTypeId,
    });

    return apiOk(calendar, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_LOAD_CALENDAR;
    return apiFail(500, message);
  }
}
