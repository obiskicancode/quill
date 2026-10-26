import { NextRequest } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { hotelSettings } from '@/db/schema';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import { getCalendarDayData } from '@/lib/db/repositories/calendar-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.view',
  });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get('date') || undefined,
  });

  if (!parsed.success) {
    return apiFail(
      422,
      'Invalid date parameter (YYYY-MM-DD)',
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
      error instanceof Error ? error.message : 'Failed to load day data.';
    return apiFail(500, message);
  }
}
