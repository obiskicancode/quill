import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import { hotelSettings } from '@/db/schema';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import { getCalendarDayData } from '@/lib/db/repositories/calendar-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminCalendarDayQuerySchema } from '@/schemas/calendar.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.view',
  });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = adminCalendarDayQuerySchema.safeParse({
    date: url.searchParams.get('date') || undefined,
  });

  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_DATE_PARAMETER,
      parsed.error.flatten(),
    );
  }

  const [settings] = await db
    .select({ timezone: hotelSettings.timezone })
    .from(hotelSettings)
    .limit(1);
  const timezone = settings?.timezone || 'Africa/Lagos';
  const { today } = hotelClock(new Date(), timezone);

  const date = parsed.data.date || today;

  try {
    const dayData = await getCalendarDayData(date);
    return apiOk(dayData, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_LOAD_DAY_DATA;
    return apiFail(500, message);
  }
}
