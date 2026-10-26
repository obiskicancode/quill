import { NextRequest } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { hotelSettings } from '@/db/schema';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import { getCalendarData } from '@/lib/db/repositories/calendar-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.coerce
    .number()
    .int()
    .refine((n) => [14, 30, 60].includes(n), {
      message: 'Days must be 14, 30, or 60.',
    })
    .default(14),
  roomTypeId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.view',
  });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get('from') || undefined,
    days: url.searchParams.get('days') || undefined,
    roomTypeId: url.searchParams.get('roomTypeId') || undefined,
  });

  if (!parsed.success) {
    return apiFail(
      422,
      'Invalid calendar query parameters',
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
      error instanceof Error ? error.message : 'Failed to load calendar data.';
    return apiFail(500, message);
  }
}
