import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import {
  getArrivalsToday,
  getDashboardActivity,
  getDashboardAttentionItems,
  getDashboardKpi,
  getDeparturesToday,
} from '@/lib/db/repositories/dashboard.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { dashboardSummaryQuerySchema } from '@/schemas/dashboard.schema';
import type { DashboardSummaryResponse } from '@/types/dashboard.types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'dashboard.view' });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = dashboardSummaryQuerySchema.safeParse({
    date: url.searchParams.get('date') ?? undefined,
  });

  if (!parsed.success) {
    return apiFail(
      400,
      ERROR_MESSAGES.INVALID_DATE_FORMAT,
      parsed.error.flatten(),
    );
  }

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const now = new Date();
  const clock = hotelClock(now, timezone);
  const today = parsed.data.date ?? clock.today;

  try {
    const [kpi, attention, arrivals, departures, activity] = await Promise.all([
      getDashboardKpi(today),
      getDashboardAttentionItems(today, now),
      getArrivalsToday(today),
      getDeparturesToday(today),
      getDashboardActivity(10, now),
    ]);

    const response: DashboardSummaryResponse = {
      kpi,
      attention,
      arrivals,
      departures,
      activity,
      timezone,
      todayDate: today,
      hasRooms: kpi.totalRooms > 0,
    };

    return apiOk(response, { noCache: true });
  } catch (error) {
    console.error('Failed to load dashboard summary:', error);
    return apiFail(500, ERROR_MESSAGES.FAILED_TO_LOAD_DASHBOARD_SUMMARY);
  }
}
